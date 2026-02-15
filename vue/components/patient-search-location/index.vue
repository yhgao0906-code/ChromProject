<!--
 * @Description: 患者搜索定位组件 组件编码：FEAT0016  元素组合编码：FEAT0016.META0001
 * 可以根据患者姓名、性别、年龄、年龄单位、出生日期、身份证号、电话号码、上次就诊时间、居住地址、病历号搜索患者
 * TODO：1、全键盘；2、Clickoutside后续可以作为一个全局指令使用；3、区分编辑和读卡状态
-->
<template>
  <div class="patient-search-location-container">
    <el-popover
      v-if="visible"
      ref="popover"
      class="patient-search-location"
      v-model="visible"
      placement="bottom"
      trigger="manual"
      width="900"
      v-clickoutside="close"
      :disabled="inputDisabled"
      popper-class="patient-search-location-popover"
    >
      <suggest-table
        ref="tableRef"
        :list="searchPatientList"
        :loading="loading"
        :visible="visible"
        @row-click="selectPatient"
      />
    </el-popover>
    <el-input
      v-arrow-picker="{
        connect: 'tableRef',
        selector: '.el-table__row',
        activeClass: 'current-row',
      }"
      ref="inputRef"
      :disabled="inputDisabled"
      v-popover:popove
      @keyup.enter.native="queryLocalPatientList"
      @keyup.down.native="inputKeyupDown"
      v-model.trim="searchInput"
      placeholder="身份证号/姓名/电话号码/就诊卡"
      clearable
      style="width: 100%; padding-right: 0"
    >
      <i
        slot="suffix"
        class="input-search el-input__icon el-icon-search"
        @click="queryLocalPatientList"
      />
    </el-input>
  </div>
</template>

<script>
import SuggestTable from './table'
import { searchPatientHeader } from './options'
import { searchMdmPatientsListWithHistoryMedicalRecord } from '@/api/appcode'
export default {
  name: 'Feat00016PatientSearchLocationMeta0001',

  components: {
    SuggestTable,
  },

  props: {
    isEdit: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    this.searchPatientHeader = searchPatientHeader
    return {
      visible: false,
      searchPatientList: [],
      searchInput: '',
      loading: false,
    }
  },
  computed: {
    inputDisabled() {
      if (this.source === 'reception' && this.isEdit) return
      if (this.disabled) return true
      return false
    },
  },
  mounted() {
    this.$nextTick(() => {
      let inputElement = this.$refs.inputRef // 假设ref名为"name"
      inputElement.focus()
    })
  },

  methods: {
    handleReset() {
      this.searchInput = ''
    },
    close() {
      this.visible = false
    },
    /**
     * @description 可通过身份证号、姓名、电话号码、就诊卡号以及门诊号进行搜索
     */
    async queryLocalPatientList() {
      const searchInput = this.searchInput
      if (!searchInput) return
      this.loading = true
      try {
        this.searchPatientList = []
        const params = {
          patientIdNumber: '', //身份证号
          patientName: '', // 姓名
          telephone: '', // 电话号码
          visitCardNo: '', // 就诊卡号
          keyword: searchInput,
        }
        const { status, data } = await searchMdmPatientsListWithHistoryMedicalRecord(params)
        this.loading = false
        if (status !== 200 || data.code !== '200') return
        this.searchPatientList = data?.data?.length ? data.data : []
        this.visible = true
        this.$refs?.tableRef?.initFocus?.()
      } catch {
        this.loading = false
      }
    },
    async inputKeyupDown() {
      if (this.visible) return
      await this.queryLocalPatientList()
    },

    // 顶部查询患者进行选择
    async selectPatient(row) {
      this.$emit('set-patient-data', row)
      this.$refs.inputRef.blur()
      this.searchInput = ''
      this.visible = false
    },
  },
}
</script>
<style lang="scss" scoped>
.patient-search-location-container {
  position: relative;

  ::v-deep(.patient-search-location-popover) {
    top: 40px !important;
  }
}
.patient-search-location {
  .input-search {
    color: $-ima-v5--color-primary !important;
  }
}
</style>
