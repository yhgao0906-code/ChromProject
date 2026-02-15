<template>
  <el-dialog
    class="opt-quick-accept-dialog"
    width="85%"
    top="50px"
    v-hotkey.stop
    :visible.sync="show"
    :title="isEdit ? '修改信息' : '快速接诊'"
    :close-on-click-modal="false"
    :append-to-body="false"
    v-keyboard-block="{}"
  >
    <OptReception
      ref="formRef"
      @close="handleClose"
      source="reception"
      :visible="show"
      :loading.sync="saveLoading"
      :isEdit="isEdit"
    />
    <template slot="footer">
      <div class="opt-quick-accept__footer imd-v5-d-flex">
        <div>
          <haic-button level="4" @click="handleClose" size="medium">取消</haic-button>
          <haic-button
            ref="acceptBtnRef"
            level="1"
            @click="handleConfirm"
            size="medium"
            :loading="saveLoading"
            v-keyboard-element="{
              lifecycleOption: keyboardLifecycleConfig.setElButtonComp({
                clickHandler: handleConfirm,
              }),
            }"
          >
            {{ isEdit ? '修改' : '接诊' }}
          </haic-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import debounce from 'lodash/debounce'
import OptReception from './opt-reception'
import { OPEN_QUICK_ACCEPT_DIALOG } from '@/utils/events-manage/index'
import * as keyboardLifecycleConfig from './keyboard-config'

export default {
  name: 'OptQuickAcceptDrawer',

  components: {
    OptReception,
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
  },

  data() {
    return {
      saveLoading: false,
      keyboardLifecycleConfig,
    }
  },

  computed: {
    show: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      },
    },
  },

  created() {
    // this.$onEvent(OPEN_QUICK_ACCEPT_DIALOG, ({ eventId }) => {
    //   this.$nextTick(() => {
    //     this.$refs?.formRef?.receptionGetEditDetail(eventId)
    //   })
    // })
  },
  mounted() {},
  methods: {
    handleClose() {
      this.saveLoading = false
      this.show = false
    },
    handleConfirm: debounce(async function () {
      this.$refs?.formRef?.handleConfirm()
    }, 500),
  },
}
</script>

<style lang="scss" scoped>
.opt-quick-accept-dialog {
  ::v-deep .el-dialog__body {
    max-height: fit-content;
    padding: 0 16px !important;
    // 解决客户端使用fit-content时，内容区域高度不够问题
    box-sizing: content-box;
  }
}
</style>
