<template>
  <div class="quick-accept">
    <haic-button class="quick-accept-bt" level="0" @click="openQuickAccept">接诊</haic-button>
    <quick-accept-dialog
      v-if="quickAcceptVisible"
      ref="quickAcceptDialog"
      :visible.sync="quickAcceptVisible"
      :is-edit="isEditPatient"
    />
  </div>
</template>
<script>
import QuickAcceptDialog from './dialog'
import {
  RECORD_MODIFY_CHECK_BEFOR_LEAVE,
  OPEN_QUICK_ACCEPT_DIALOG,
} from '@/utils/events-manage/index'
export default {
  name: 'QuickAccept',
  components: { QuickAcceptDialog },
  data() {
    return {
      quickAcceptVisible: false,
      isEditPatient: false,
    }
  },
  created() {
    this.$onEvent(OPEN_QUICK_ACCEPT_DIALOG, ({ eventId }) => {
      this.isEditPatient = true
      this.quickAcceptVisible = true

      this.$nextTick(() => {
        this.$refs?.quickAcceptDialog?.$refs?.formRef?.receptionGetEditDetail(eventId)
      })
    })

    // this.$onEvent(OPEN_QUICK_ACCEPT_DIALOG, ({ eventId }) => {
    //   this.$nextTick(() => {
    //     this.$refs?.formRef?.receptionGetEditDetail(eventId)
    //   })
    // })
  },
  methods: {
    openQuickAccept() {
      // 前置判断。如果有病历信息未保存则提示
      this.$emitEvent(RECORD_MODIFY_CHECK_BEFOR_LEAVE, {
        type: 'clear',
        callback: () => {
          this.quickAcceptVisible = true
          this.isEditPatient = false
        },
      })
    },
  },
}
</script>
