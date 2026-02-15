import moment from 'moment'

import { createPriceStr } from '@/utils/utils'
export const PREVEIWE_LIST_CONFIG = [
  {
    label: '门诊流水号',
    key: 'businessId',
    formatter: (val) => {
      return val || '--'
    },
  },
  {
    label: '操作员',
    key: 'registOperatorName',
    formatter: (val) => {
      return val || '--'
    },
  },
  {
    label: '挂号日期',
    key: 'registDatetime',
    formatter: (val) => {
      return val ? moment(val).format('YYYY-MM-DD HH:mm') : '--'
    },
  },
  {
    label: '挂号费',
    key: 'basicRegisterFee',
    formatter: (val) => {
      return createPriceStr(val)
    },
  },
  {
    label: '诊察费',
    key: 'diagnosisFee',
    formatter: (val) => {
      return createPriceStr(val)
    },
  },
  {
    label: '其他费',
    key: 'otherFee',
    formatter: (val) => {
      return createPriceStr(val)
    },
  },
]
