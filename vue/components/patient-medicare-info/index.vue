<template>
  <div class="patient-medicare-info ima-v5-flex-left" :style="{ maxWidth: `${maxWidth}px` }">
    <div
      class="patient-medicare-info__item"
      v-for="(item, index) in medicareInfoOptions"
      :key="item.name"
      style="margin-right: 5px"
    >
      <span style="margin-right: 5px">{{ `${item.name}:` }}</span>
      <span>{{ fomatMedicareInfo(basic?.[item?.key]) }}</span>
      <span v-if="index !== medicareInfoOptions.length - 1" style="margin-left: 5px; margin-right: 8px" class="split"
        >|</span
      >
    </div>
  </div>
</template>

<script>
export default {
  name: 'PatientMedicareInfo',

  props: {
    maxWidth: {
      type: Number,
      default: 500,
    },
    basic: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      medicareInfoOptions: [
        { name: '人员编号', key: 'insurPsnNo' },
        { name: '险种', key: 'insurInsuranceTypeName' },
        { name: '医保余额', key: 'insurBalance' },
        { name: '备案信息', key: 'insurDiseName' },
      ],
    }
  },

  methods: {
    fomatMedicareInfo(val) {
      if (!val) return '--'
      return val
    },
  },
}
</script>

<style lang="scss" scoped>
.patient-medicare-info,
.patient-medicare-info__item {
  display: flex;
  justify-content: space-between;
  .split {
    color: $-ima-v5--color-6;
  }
}
</style>
