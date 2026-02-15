<template>
  <div class="registered-preview">
    <div class="ima-v5-flex-between">
      <div
        class="registered-preview__item"
        v-for="(item, index) in PREVEIWE_LIST_CONFIG"
        :key="item.name"
      >
        <span v-if="index !== 0" style="margin-left: 5px; margin-right: 12px" class="split">|</span>
        <span class="registered-preview__item_label">{{ `${item.label}：` }}</span>
        <span>{{ item.formatter ? item.formatter(basic[item.key]) : '--' }}</span>
      </div>
    </div>
    <div class="registered-preview__total">
      <span>
        挂号金额：<span class="registered-preview__total_amount">{{
          createPriceStr(basic.totalAmount)
        }}</span>
      </span>
    </div>
  </div>
</template>
<script>
import { PREVEIWE_LIST_CONFIG } from './options'
import { createPriceStr } from '@/utils/utils'
export default {
  name: 'RegisteredPreview',
  props: {
    basic: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      PREVEIWE_LIST_CONFIG,
    }
  },
  methods: {
    createPriceStr,
  },
}
</script>
<style scoped lang="scss">
.registered-preview {
  padding: 10px 0;
  font-size: 14px;
  color: #333;
  padding-left: 40px;
  &__item {
    width: 16.6%;
    display: flex;
    align-items: center;
    margin-right: 20px;
    .split {
      color: #999;
    }
    &_label {
      display: inline-block;
    }
  }
  &__total {
    padding-top: 22px;
    text-align: right;
    padding: 22px 12px;
    &_amount {
      color: $-ima-v5--color-danger;
      font-weight: bold;
      font-size: $-ima-v5--font-size-large;
    }
  }
}
</style>
