<template>
  <div v-loading="loading">
    <vxe-grid
      :keyboard-config="{ isArrow: true, isEnter: true }"
      class="patient-list-table__list"
      ref="vxeGridRef"
      v-bind="gridOptions"
      :data="list"
      @cell-click="handleCellClick"
      :scroll-y="{ enabled: true, gt: 30 }"
      @keydown="keydown"
    >
    </vxe-grid>
  </div>
</template>
<script>
import { emptyFormat } from '@/utils/utils'

export default {
  name: 'PatientSearchLocationTable',
  props: {
    list: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    visible: {
      type: Boolean,
    },
  },
  data() {
    return {
      gridOptions: {
        border: 'full',
        stripe: true,
        resizable: true,
        // height: 'auto',
        maxHeight: '450',
        rowId: 'id',
        autoResize: true,
        headerCellStyle: {
          padding: '6px 0',
        },
        // highlightCurrentRow: true,
        radioConfig: {
          highlight: true,
        },
        checkboxConfig: {
          highlight: true,
        },
        headerRowClassName: 'table-header',
        rowConfig: {
          isCurrent: true,
          isHover: true,
          height: '32',
        },
        showOverflow: 'tooltip',
        tooltipConfig: {
          zIndex: 9999,
        },
        columns: [
          { type: 'radio', width: 35, visible: false, align: 'center' },
          {
            field: 'patientName',
            title: '姓名',
            formatter: emptyFormat,
          },
          {
            field: 'patientIdNumber',
            title: '身份证号',
            width: 190,
            formatter: emptyFormat,
          },
          {
            field: 'sexName',
            title: '性别',
            width: 106,
            formatter: emptyFormat,
          },
          {
            field: 'telephone',
            title: '联系电话',
            align: 'left',
            width: 130,
            formatter: emptyFormat,
          },
          {
            field: 'visitCardNo',
            title: '就诊卡号',
            align: 'left',
            width: 130,
            formatter: emptyFormat,
          },
          {
            field: 'eventDatetime',
            title: '上次就诊时间',
            align: 'left',
            width: 178,
            formatter: emptyFormat,
          },
        ],
      },
    }
  },
  methods: {
    handleCellClick({ row }) {
      console.log(row)
      this.$emit('row-click', row)
    },
    initFocus() {
      this.$nextTick(() => {
        this.$refs.vxeGridRef?.focus?.()
        this.$refs.vxeGridRef?.scrollToRow?.(this.list[0])
      })
    },
    // 键盘enter事件
    keydown({ $event, $table: { currentRow } }) {
      if (!currentRow || !this.visible) return

      if ($event?.keyCode === 13) {
        this.handleCellClick({ row: currentRow })
      }
    },
  },
}
</script>
<style lang="scss">
.table-header {
  ::v-deep .vxe-header--column {
    padding: 5px;
  }
}
</style>
