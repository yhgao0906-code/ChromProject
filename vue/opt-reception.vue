<template>
  <div class="opt-reception">
    <app-code-limit :appCodes="LIMIT_APP">
      <div class="opt-reception-search ima-v5-flex-left ima-v5-mt-small">
        读卡方式：
        <div
          v-for="(item, index) in medicalCard"
          :key="item.medicalCardTypeCode"
          class="ima-v5-flex-center"
          @click="handleReadCard(item)"
        >
          <haic-icon-font
            :icon-class="CARD_ICON_MAP[item.medicalCardTypeCode]"
            style="font-size: 26px"
          />
          <span>{{ item.medicalCardTypeName }}</span>
          <el-divider direction="vertical" v-if="!!(index < medicalCard.length - 1)"></el-divider>
        </div>

        <patient-search-location
          ref="searchRef"
          :is-edit="isEdit"
          class="ima-v5-flex-1 ima-v5-ml-small"
          @set-patient-data="setPatientData"
          :disabled="disabled"
          :isEdit="isEdit"
        />
      </div>
    </app-code-limit>
    <div class="ima-v5-flex-column ima-v5-mt-small">
      <div class="opt-reception__patient-basic-info ima-v5-flex-default">
        <h3 class="title">患者信息</h3>
        <patient-basic-info
          ref="basicRef"
          class="content"
          :visible="visible"
          :rules="rules"
          :basic="patientInfo"
          :is-edit="isEdit"
          v-bind="$attrs"
          :disabled="disabled"
        />
      </div>
      <div class="opt-reception__patient-medical-info">
        <div class="patient-medicare-info-content">
          <h3 class="title">就诊信息</h3>
          <patient-medicare-info :basic="patientInfo" :max-width="800" />
        </div>
        <patient-medical-info
          :is-edit="isEdit"
          :disabled="disabled"
          :visible="visible"
          :rules="rules"
          :basic="patientInfo"
          :source="source"
          v-bind="$attrs"
          ref="medicalRef"
          class="patient-medical-info-content"
        />
      </div>
    </div>
  </div>
</template>

<script>
import PatientBasicInfo from '@/views/his/opt-doctor-station-plugin/components/quick-accept/components/patient-basic-info'
import PatientSearchLocation from '@/views/his/opt-doctor-station-plugin/components/quick-accept/components/patient-search-location'
import PatientMedicalInfo from '@/views/his/opt-doctor-station-plugin/components/quick-accept/components/patient-medical-info'
import PatientMedicareInfo from '@/views/his/opt-doctor-station-plugin/components/quick-accept/components/patient-medicare-info'

import { medicalCardReadingConfig } from '@/api/quick-accept'
import { AppCodeLimit } from '@haic/common-components'
import {
  quickReception,
  findTodayUnfinished,
  updatePatientInfo,
  patientListReception,
  patientBasicInfo,
  registerApi,
} from '@/api/appcode'
import {
  CARD_ICON_MAP,
  LIMIT_APP,
  CONFIM_MESSAGE_NAME_MAP,
} from '@/views/his/opt-doctor-station-plugin/components/quick-accept/util'
import { SET_REPECTION_ID_CACHE, EXIT_RECEPTION, GO_RECEPTION } from '@/utils/events-manage/index'
import * as keyboardLifecycleConfig from '@/views/his/opt-doctor-station-plugin/components/quick-accept/keyboard-config'
const READ_CARD_TYPES = {
  IDCARD: '2', // 身份证
  INSURANCE_CARD: '1', // 社保卡
}
import { isOpenArchive } from '@/remotes/ph-helper'

export default {
  name: 'OptQuickAcceptDrawer',

  components: {
    PatientBasicInfo,
    PatientSearchLocation,
    PatientMedicalInfo,
    PatientMedicareInfo,
    AppCodeLimit,
  },

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    isEdit: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    // 来源区分接诊和挂号
    source: {
      type: String,
      default: 'reception',
    },
  },

  data() {
    this.CONFIM_MESSAGE_NAME_MAP = CONFIM_MESSAGE_NAME_MAP
    this.LIMIT_APP = LIMIT_APP
    this.CARD_ICON_MAP = CARD_ICON_MAP
    return {
      rules: {},
      medicalCard: [],
      patientInfo: {},
      asyncRulseArr: [],
      keyboardLifecycleConfig,
    }
  },

  computed: {
    userInfo() {
      return window.globalWebDme?.getItem('userInfo')
    },
    fullUserInfo() {
      return window.globalWebDme?.getItem('fullUserInfo')
    },
  },

  watch: {
    visible: {
      handler(val) {
        if (!val) return
        this.init()
      },
      immediate: true,
    },
  },

  created() {},

  mounted() {},

  methods: {
    updateLoading(val) {
      this.$emit('update:loading', val)
    },
    async init() {
      this.initRules()
      this.patientInfo = {}
      this.updateLoading(false)
      this.initMedicalCardReadin()
    },
    getFeeInfo() {
      return this.$refs.medicalRef.getFeeInfo()
    },
    getPatientInfo() {
      return { ...(this.$refs?.basicRef?.form || {}), ...(this.$refs?.medicalRef?.form || {}) }
    },
    // 重置
    handleReset() {
      this.$refs.searchRef.handleReset()
      this.$refs.basicRef.handleReset()
      this.$refs.medicalRef.handleReset()
    },
    //查询患者基础信息 - 接诊
    async receptionGetEditDetail(eventId) {
      if (this.source !== 'reception' || !eventId) return
      const { data } = await patientBasicInfo({ eventId })
      const { code } = data || {}
      this.patientInfo = {}
      if (code === '200' && data.data) {
        this.patientInfo = data.data
      }
    },
    // 挂号-获取编辑详情
    setRegisterDetail(data) {
      this.$refs.searchRef.handleReset()
      this.patientInfo = data
    },
    setPatientData(val) {
      let mdmPatientId = val?.mdmPatientId || val?.id
      this.patientInfo = { ...val, mdmPatientId }

      const focusTarget = () => {
        const basicInfoVm = this.$refs.basicRef
        const focusVisitCardNo = basicInfoVm?.focusVisitCardNo
        if (focusVisitCardNo && typeof focusVisitCardNo === 'function') {
          focusVisitCardNo()
        }
      }
      focusTarget()
    },
    async initRules() {
      await this.getRulseFromSwtich()
      if (!this.asyncRulseArr?.length) return
      const rule = { required: true, message: '必填', trigger: ['blur', 'change'] }
      const rules = this.asyncRulseArr.reduce((acc, o) => {
        acc[o] = [rule]
        return acc
      }, {})
      this.rules = rules
    },
    async getRulseFromSwtich() {
      const switchModule = window.__haicApp__.getContext('switchModule')
      const targetSwitchCode = switchModule.getSwitchCodeMap().OUT.QUICK_ACCEPT_REQUIRED_ITEMS_CODE
      const switchData = await switchModule.getSwitchValue(targetSwitchCode)
      this.asyncRulseArr = switchData?.[targetSwitchCode]
        ? switchData?.[targetSwitchCode].split(',')
        : []
    },
    async initMedicalCardReadin() {
      let appCode = window.globalWebDme.getItem('appCode')
      if (LIMIT_APP.includes(appCode)) return
      const { data } = await medicalCardReadingConfig()
      if (data?.code !== '200') return
      this.medicalCard = data?.data?.length ? data.data : []
    },
    handleClose() {
      this.patientInfo = {}
      this.$emit('close')
    },
    // 提交前校验（姓名）
    preConfim(params) {
      if (this.patientInfo?.patientName && params.patientName !== this.patientInfo?.patientName) {
        this.$confirm(
          `当前操作修改，【${this.patientInfo.patientName}】修改为【${params.patientName}】，确认是否是同一患者？`,
          '提示',
          {
            confirmButtonText: `确认并${
              this.isEdit ? '修改' : this.CONFIM_MESSAGE_NAME_MAP[this.source]
            }`,
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
            closeOnPressEscape: false,
          }
        )
          .then(() => {
            this.confimAxios(params)
          })
          .catch(() => {
            this.updateLoading(false)
          })
        return
      }
      this.confimAxios(params)
    },

    // isSetFLagParams 挂号时是否和结算一起的参数，挂号报错时用到，接诊时没用
    async handleConfirm(isSetFLagParams = {}) {
      let basicParma = await this.$refs.basicRef.getFormData()
      let medicalParma = await this.$refs.medicalRef.getFormData()
      if (!basicParma) return this.$message.warning('患者信息有校验未通过')
      if (!medicalParma) return this.$message.warning('就诊信息有校验未通过')
      let param = {
        ...basicParma,
        ...medicalParma,
        ...isSetFLagParams,
      }
      this.updateLoading(true)
      this.preConfim(param)
    },

    confimAxios(param) {
      if (this.isEdit) {
        this.savePatientInfo(param)
      } else {
        this.getRecepetionNow(param)
      }
    },
    getRecepetionNow(param) {
      if (param?.mdmPatientId) {
        this.checkTodayUnfinished(param) // 查询今日是否有就诊数据
      } else {
        this.receptionSave(param) //直接新增就诊
      }
    },
    receptionSave(param) {
      const eventMap = {
        ['reception']: () => this.quickReceptionSave(param),
        ['registration']: () => this.optRegistraSave(param),
      }
      eventMap[this.source]()
    },
    checkTodayUnfinished(param) {
      const eventMap = {
        ['reception']: () => this.quickReceptionCheckUnfinished(param),
        ['registration']: () => this.registerCheckUnfinished(param),
      }
      eventMap[this.source]()
    },

    // 接诊
    async quickReceptionSave(param) {
      try {
        const { status, data } = await quickReception(param)
        if (status !== 200 || data.code !== '200') return this.updateLoading(false)
        if (data?.data && Object.keys(data.data).length) {
          this.$emitEvent(SET_REPECTION_ID_CACHE, { eventId: data?.data?.eventId })
          this.addNewReception(data.data)

          // 公卫-创建档案
          this.createArchive(param, data.data)
          return
        }
        this.updateLoading(false)
      } catch {
        this.updateLoading(false)
      }
    },

    // 挂号
    async optRegistraSave(param) {
      try {
        const { status, data } = await registerApi(param)
        if (status !== 200 || data.code !== '200') return this.updateLoading(false)
        if (data?.data && Object.keys(data.data).length) {
          this.$message.success('挂号成功')
          this.$emit('success', data.data, async () => {
            await this.printRegister(data.data)
          })

          // 公卫-创建档案
          this.createArchive(param, data.data)

          this.handleClose()
          // this.printRegister(data.data, param)
          return
        }
        this.updateLoading(false)
      } catch {
        this.updateLoading(false)
      }
    },
    //打印挂号单
    async printRegister({ eventId }) {
      try {
        const paramData = {
          mid: eventId,
          orgId: this.userInfo?.orgId,
        }
        await this.$print.commonPrint({
          type: 'MZ_GHDJ',
          config: paramData,
        })
      } catch (error) {
        console.error('printRecord error: ', error)
      }
    },

    async registerCheckUnfinished(param) {
      const { mdmPatientId, patientName } = param
      if (!mdmPatientId) return this.updateLoading(false)
      const { data } = await findTodayUnfinished({
        mdmPatientId: mdmPatientId,
        deptCode: param?.deptCode || '',
      })
      if (data.code !== '200') return this.updateLoading(false)
      if (data?.data) {
        this.$confirm(`${patientName}今日已有就诊记录，是否需要继续挂号？`, '提示', {
          confirmButtonText: '确认挂号',
          cancelButtonText: '取消',
          type: 'warning',
          closeOnClickModal: false,
          closeOnPressEscape: false,
          distinguishCancelAndClose: true,
        })
          .then(() => {
            this.receptionSave(param)
          })
          .catch(() => {
            this.updateLoading(false)
          })
      } else {
        this.receptionSave(param)
      }
    },

    async quickReceptionCheckUnfinished(param) {
      const { mdmPatientId, patientName } = param
      if (!mdmPatientId) return this.updateLoading(false)
      const { data } = await findTodayUnfinished({ mdmPatientId: mdmPatientId })
      if (data.code !== '200') return this.updateLoading(false)
      if (data?.data) {
        this.$confirm(
          `${patientName}今日已有诊中数据，点击直接跳转，跳转至原有记录；点击确认新增，将增加一条新的就诊记录？`,
          '提示',
          {
            confirmButtonText: '直接跳转',
            cancelButtonText: '确认新增',
            type: 'warning',
            closeOnClickModal: false,
            closeOnPressEscape: false,
            distinguishCancelAndClose: true,
          }
        )
          .then(() => {
            this.jumpOldReception(data?.data)
          })
          .catch((type) => {
            if (type === 'cancel') {
              this.receptionSave(param)
            } else {
              this.updateLoading(false)
            }
          })
      } else {
        this.receptionSave(param)
      }
    },

    addNewReception(val) {
      this.$emitEvent(GO_RECEPTION, { ...val, type: 'new' })
      this.handleClose()
    },

    // 跳转至已有就诊记录
    jumpOldReception(val) {
      const { eventId } = val
      let currentRecptionEventId = this.$outPatientImaWebDme?.getItem('RECEPTION_EVENTID')
      if (currentRecptionEventId && eventId !== currentRecptionEventId) {
        this.$emitEvent(EXIT_RECEPTION, { eventId: currentRecptionEventId })
      }
      this.getReceptionBeforeCheck(val)
    },

    // 跳转历史就诊记录前校验
    async getReceptionBeforeCheck({ eventId }) {
      if (!eventId) return this.updateLoading(false)
      try {
        const { status, data } = await patientListReception({ eventId })
        if (status !== 200 || data.code !== '200') return this.updateLoading(false)
        this.$emitEvent(SET_REPECTION_ID_CACHE, { eventId: eventId })
        this.$emitEvent(GO_RECEPTION, { eventId: eventId, type: 'old' })
        this.handleClose()
      } catch {
        this.updateLoading(false)
      }
    },
    // 保存
    async savePatientInfo(params) {
      const { data } = await updatePatientInfo(params)
      if (data?.code === '200') {
        this.$message.success('患者信息修改成功')
        this.$emitEvent('refresh-patient-list')
        this.handleClose()
        return
      }
      this.updateLoading(false)
    },

    async handleReadCard({ medicalCardTypeCode }) {
      const handleMap = {
        [READ_CARD_TYPES.IDCARD]: async () => {},
        [READ_CARD_TYPES.INSURANCE_CARD]: this.handleInsuranceReadCard,
      }
      await handleMap[medicalCardTypeCode]()
    },

    async handleInsuranceReadCard() {
      const medicalInsuranceManager = window.__haicApp__.medicalInsuranceManager
      const res = await medicalInsuranceManager.createEnv(() => {
        return medicalInsuranceManager.medicalReadCard({ sourceType: 'MZ_GH' })
      })
      this.$set(this, 'patientInfo', { ...this.patientInfo, ...res?.hisInfo })
    },

    // 公卫-创建档案
    async createArchive(params, data) {
      if (params.checked && (await isOpenArchive())) {
        const creatBoxRef = this.$refs.basicRef?.$refs?.createArchiveCheckboxRef
        if (creatBoxRef) {
          try {
            await creatBoxRef.isHasManagement(
              {
                ...params,
                mdmPatientId: data.mdmPatientId,
              },
              this.fullUserInfo
            )
          } catch (error) {
            console.error('公卫-创建档案出错', error)
          }
        }
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.opt-reception {
  color: $-ima-v5--color-12;
  display: flex;
  flex-direction: column;
  height: 100%;
  &__patient-search {
    height: 60px;
    box-shadow: 0px -1px 0px 0px rgba(0, 0, 0, 0.12) inset;
  }
  &__patient-medical-info {
    width: 100%;
    .patient-medicare-info-content {
      display: flex;
      justify-content: space-between;
    }
  }
}
.title {
  font-weight: 600;
  margin: 12px 0;
  &::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 22px;
    vertical-align: -6px;
    background: $-ima-v5--color-primary;
    margin-right: 12px;
    border-radius: 2px;
  }
}
</style>
