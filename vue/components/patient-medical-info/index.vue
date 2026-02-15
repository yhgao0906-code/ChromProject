<!--
 * @Description: 患者就诊信息组件 组件编码：FEAT0004  元素组合编码：FEAT0004.META0003
 * TODO 1、添加全键盘功能; 2、区分编辑或者读卡状态
-->
<template>
  <div class="patient-medical-info ima-v5-pb-small">
    <el-form
      inline
      ref="formRef"
      :disabled="disabled"
      :model="form"
      :label-width="labelWidth"
      :rules="formRules"
      :show-message="false"
      :validate-on-rule-change="false"
      class="ima-v5-d-flex"
    >
      <!-- 费别类型 默认为自费，如果成功读取医保卡，则自动变为相应的医保-->
      <el-form-item label="费别类型" prop="feeTypeCode">
        <el-select
          v-model="form.feeTypeCode"
          clearable
          :disabled="feeTypeDisabled"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'feeTypeCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in FEE_TYPE_OPTIONS"
            :key="item.id"
            :label="item.feeTypeName"
            :value="item.feeTypeCode"
          />
        </el-select>
      </el-form-item>
      <!-- 号别类型 默认为免费号-->
      <el-form-item label="号别类型" prop="registTypeCode">
        <el-select
          v-model="form.registTypeCode"
          clearable
          :disabled="feeTypeDisabled"
          @change="handleregistTypeChange"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'registTypeCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in REGIST_TYPE_OPTIONS"
            :key="item.id"
            :label="item.registerTypeName"
            :value="item.registerTypeCode"
          />
        </el-select>
      </el-form-item>
      <!-- 病历本标志，默认不勾选 -->
      <el-form-item prop="haveMedicalBookFlag">
        <div class="ima-v5-flex-between">
          <!-- 挂号科室 不允许为空，默认当前登陆科室 -->
          <el-form-item
            v-if="isRegistration"
            label="挂号科室"
            prop="deptCode"
            class="ima-v5-flex-1"
            :rules="{ required: true, message: '请选择挂号科室', trigger: 'change' }"
          >
            <el-select
              v-model="form.deptCode"
              clearable
              :disabled="registerDeptDisabled"
              v-keyboard-element="{
                lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
                  field: 'deptCode',
                  getFormRef: () => {
                    return this.$refs.formRef
                  },
                }),
              }"
            >
              <el-option
                v-for="item in registerDetpOptions"
                :key="item.id"
                :label="item.name"
                :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="haveMedicalBookFlag" lable=" " label-width="20px">
            <el-checkbox
              v-model="form.haveMedicalBookFlag"
              true-label="1"
              false-label="0"
              class="ima-v5-pl-mini"
              >病历本</el-checkbox
            >
          </el-form-item>
        </div>
      </el-form-item>

      <el-form-item label="备注" prop="remark" style="width: 100%">
        <el-input
          placeholder="请输入"
          v-model.trim="form.remark"
          type="textarea"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setRemarkComp({
              field: 'remark',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
    </el-form>
    <registered-preview v-if="isRegistration" :basic="feeInfo" />
  </div>
</template>

<script>
import cloneDeep from 'lodash/cloneDeep'
import { getImaDepts } from '@/api/common.js'
import RegisteredPreview from '@/views/his/opt-doctor-station-plugin/components/quick-accept/components/registered-preview'
import {
  getRegisterTypeConfigList,
  getAllFeeTypeConfigList,
  getRegisterTypeConfigListByCodes,
} from '@/api/quick-accept'
import * as keyboardLifecycleConfig from '../../keyboard-config'

class Form {
  /** 费别类型 */
  feeTypeCode = ''
  feeTypeName = ''
  /** 号别类型 */
  registTypeCode = ''
  registTypeName = ''
  /** 备注 */
  remark = ''
  /** 病历本标志 */
  haveMedicalBookFlag = '0'
  constructor(source, info) {
    if (source === 'registration') {
      this.deptCode = window.globalWebDme?.getItem('deptInfo')?.deptCode
    }

    if (info && Object.keys(info).length) {
      for (let k in this) {
        this[k] = info[k] || ''
      }
    }
  }
}
export default {
  name: 'PatientMedicalInfo',
  components: {
    RegisteredPreview,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    labelWidth: {
      type: String,
      default: '120px',
    },
    rules: {
      type: Object,
      default: () => ({}),
    },
    basic: {
      type: Object,
      default: () => ({}),
    },
    isEdit: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      FEE_TYPE_OPTIONS: [],
      REGIST_TYPE_OPTIONS: [],
      feeInfo: {},
      form: {},
      deptmentListOptions: [], // 当前机构下的所有科室:
      registerDetpOptions: [],
      // rules: {
      //   feeTypeCode: [{ required: true, message: '请选择费别类型', trigger: 'change' }],
      //   registTypeCode: [{ required: true, message: '请选择号别类型', trigger: 'change' }],
      //   deptName: [{ required: true, message: '请选择挂号科室', trigger: 'change' }],
      // },
      keyboardLifecycleConfig,
    }
  },
  computed: {
    deptInfo() {
      return window.globalWebDme.getItem('deptInfo')
    },
    formRules() {
      if (!this.rules || !Object.keys(this.rules).length) {
        return {}
      }
      // 挂号的时候挂号科室必填 接诊时 无挂号科室 公用一个配置项所有 接诊的时候掉挂号科室
      const formKeys = Object.keys(this.form).filter((o) => {
        if (!this.isRegistration) {
          return !['deptCode', 'deptName'].includes(o)
        } else {
          return o
        }
      })

      return Object.keys(this.rules)
        .filter((key) => formKeys.includes(key))
        .reduce((rule, key) => {
          rule[key] = this.rules[key]
          return rule
        }, {})
    },

    // 是挂号
    isRegistration() {
      return this.source === 'registration'
    },
    // 挂号科室
    registerDeptDisabled() {
      return this.source === 'registration' ? this.disabled : false
    },
    // 费别号别
    feeTypeDisabled() {
      if (this.source === 'reception' && this.isEdit) return true
      return this.disabled
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
    basic: {
      async handler(val) {
        if (!val || !Object.keys(val).length) return
        if (this.isEdit) {
          this.form = new Form(this.source, val)
          this.feeInfo = cloneDeep(val)
        } else {
          this.form = new Form(this.source)
          this.form.registTypeCode = this.REGIST_TYPE_OPTIONS[0]?.registerTypeCode
          this.form.feeTypeCode = this.FEE_TYPE_OPTIONS[0]?.feeTypeCode
          this.feeInfo = {}
        }
        if (!this.disabled) {
          // 挂号科室默认当前登陆科室
          await this.getDeptList(true)
        } else {
          if (this.isRegistration) {
            this.form.deptCode = val?.deptName // 只读的时候显示当前科室的name
          }
        }

        this.clearValidate()
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    async init() {
      await this.getImaDeptsFn() // 获取所有科室
      await this.getRegistType() //获取号别费别默认取第一项
      await this.getFeeType() // 费别默认取第一项
      this.handleReset()
    },
    initForm() {
      this.form = new Form(this.source)
      this.form.registTypeCode = this.REGIST_TYPE_OPTIONS?.[0]?.registerTypeCode || ''
      this.form.feeTypeCode = this.FEE_TYPE_OPTIONS?.[0]?.feeTypeCode || ''
    },
    async handleReset() {
      this.initForm()
      await this.getDeptList(true)
      this.clearValidate()
    },
    clearValidate() {
      this.$nextTick(() => {
        this.$refs?.formRef?.clearValidate()
      })
    },
    async getRegistType() {
      this.REGIST_TYPE_OPTIONS = []
      let params = {
        deptCode: this.deptInfo?.deptCode || '',
        doctorCode: '',
        emergencyFlag: '',
        expertFlag: '',
      }
      const { data } = await getRegisterTypeConfigList(params)
      if (data.code === '200') {
        if (data?.data?.length) {
          this.REGIST_TYPE_OPTIONS = data.data
        }
      }
    },
    async getFeeType() {
      this.FEE_TYPE_OPTIONS = []
      const { data } = await getAllFeeTypeConfigList()
      if (data.code === '200') {
        this.FEE_TYPE_OPTIONS = Array.isArray(data?.data) && data?.data?.length ? data.data : []
        if (data?.data?.length) {
          this.FEE_TYPE_OPTIONS = data.data
        }
      }
    },

    async getFormData() {
      const isValid = await this.validateForm()
      if (!isValid) return false
      return this.handleParams()
    },
    handleParams() {
      let params = cloneDeep(this.form)
      let registTypeName = this.REGIST_TYPE_OPTIONS.find(
        (o) => o.registerTypeCode === this.form.registTypeCode
      )?.registerTypeName
      let feeTypeName = this.FEE_TYPE_OPTIONS.find(
        (o) => o.feeTypeCode === this.form.feeTypeCode
      )?.feeTypeName
      if (this.isRegistration) {
        let deptName = this.deptmentListOptions.find((o) => o.code === this.form.deptCode)?.name
        return { ...params, deptName, feeTypeName, registTypeName }
      } else {
        // 接诊不需要科室字段
        delete params.deptCode
        return { ...params, feeTypeName, registTypeName }
      }
    },
    validateForm() {
      return new Promise((resolve) => {
        this.$refs.formRef.validate((valid) => {
          resolve(valid)
        })
      })
    },

    handleregistTypeChange() {
      this.form.deptCode = ''
      this.getDeptList()
    },

    async getDeptList(isClear = false) {
      if (!this.isRegistration) return
      await this.getRegisterConfigList()
      if (!isClear) return
      let currentIndex = (this.registerDetpOptions || []).findIndex(
        (o) => o.code === this.deptInfo?.deptCode
      )
      if (currentIndex < 0) {
        this.form.deptCode = ''
      }
    },
    getFeeInfo() {
      return this.FEE_TYPE_OPTIONS.find((o) => o.feeTypeCode === this.form.feeTypeCode)
    },
    async getRegisterConfigList() {
      if (!this.isRegistration) return
      const self = this
      if (!this.form?.registTypeCode) {
        this.registerDetpOptions = []
        return
      }
      try {
        const { data } = await getRegisterTypeConfigListByCodes({
          registerTypeCodeList: [this.form?.registTypeCode],
        })

        const { data: _data } = data
        if (data?.data?.length) {
          let info = data?.data?.[0]
          this.feeInfo = {
            basicRegisterFee: info?.basicRegisterFee,
            diagnosisFee: info.diagnosisFee,
            otherFee: info.otherFee,
            totalAmount: info?.totalAmount,
            registDatetime: null,
            registOperatorName: this.userInfo?.name,
            businessId: null,
          }

          const registerDetp = info?.deptCodeStr?.split(',') || []
          this.registerDetpOptions = self.deptmentListOptions.filter((o) =>
            registerDetp.includes(o.code)
          )
        }
      } catch (err) {
        console.log(err)
      }
    },
    /**
     * 查询当前机构下的所有科室
     */
    async getImaDeptsFn() {
      if (!this.isRegistration) return
      const userInfo = window.globalWebDme.getItem('userInfo')
      const OUTPATIENT_DEPT_ATTR_CODE =
        window.__haicApp__?.busiConstModule?.busiCodeMap?.BASIC?.OUTPATIENT_DEPT_ATTR_CODE
      const params = {
        filter: {
          status: 1,
          isLast: 1,
          orgId: userInfo.orgId,
          deptAttribute: OUTPATIENT_DEPT_ATTR_CODE || '1',
        },
      }
      const { status, data } = await getImaDepts(params)
      if (status === 200 && data?.length) {
        this.deptmentListOptions = data.map((item) => ({
          name: item.deptName,
          code: item.deptCode,
        }))
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.patient-medical-info {
  .el-form {
    flex-wrap: wrap;
  }
  ::v-deep {
    .el-form-item {
      display: flex;
      width: 33.33%;
      height: 40px;
      margin-right: 0;
      margin-bottom: 12px;
      &__label {
        color: $-ima-v5_color-black;
      }
      &__content {
        flex: 1;
        .el-input,
        .el-select,
        .el-date-editor {
          width: 100%;
        }
        .el-select {
          .el-input {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>
