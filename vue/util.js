const { APP_HAIC_FPVA } = window.__haicApp__.getContext('appcodeModule').APPS

export const LIMIT_APP = [APP_HAIC_FPVA]

import {
  IdentityCodeValid,
  getSex,
  getBirth,
  // getAgeSexBirthByIdcard,
  // getAgeAndUnitByBirthday,
  monthDayDiff,
} from '@/utils/idcard'

export const getSexBirthByIdcard = (idCard) => {
  return {
    birth: getBirth(idCard),
    sex: getSex(idCard),
  }
}

export const getAgeUnitByBirthday = (start, n, end) => {
  if (!start) return
  let defaultAgeYear = n || '7'
  let endTime = end || window.__haicApp__.__TOOLKITS__?.networkClock?.getCurrentTime() || Date.now()
  let { day, month, year } = monthDayDiff(start, endTime)
  if (year - defaultAgeYear >= 0) {
    return {
      age1FValue: year,
      age1FCode: '1',
      age1FName: '岁',
      ageSecValue: undefined,
      ageSecCode: '',
      ageSecName: '',
    }
  } else if (year - 0 > 0 && year - defaultAgeYear < 0) {
    return {
      age1FValue: year,
      age1FCode: '1',
      age1FName: '岁',
      ageSecValue: month,
      ageSecCode: '2',
      ageSecName: '月',
    }
  } else if (month - 0 > 0) {
    return {
      age1FValue: month,
      age1FCode: '2',
      age1FName: '月',
      ageSecValue: day,
      ageSecCode: '3',
      ageSecName: '天',
    }
  } else {
    return {
      age1FValue: day,
      age1FCode: '3',
      age1FName: '天',
      ageSecValue: undefined,
      ageSecCode: '',
      ageSecName: '',
    }
  }
}

// 身份证有效性验证
export const idNumberValidatedRule = {
  validator: (rule, value, callback) => {
    if (!value && !rule.required) {
      callback()
      return
    }

    const ret = IdentityCodeValid(value)

    if (!ret.pass) {
      return callback(new Error(ret.tip))
    }

    callback()
  },
}

export const concatObjArray = (obj1, obj2) => {
  for (let key in obj2) {
    if (Reflect.has(obj1, key)) {
      if (Array.isArray(obj1[key])) {
        obj1[key] = obj1[key].concat(obj2[key])
      }
    } else {
      obj1[key] = obj2[key]
    }
  }
  return obj1
}

export const CARD_ICON_MAP = {
  1: 'icon-yibao',
  2: 'icon-idcard',
  3: 'icon-dianzijiankangka',
  4: 'icon-jiuzhenka',
}

export const validMouth = (age, unit) => {
  if (age || age === 0) {
    if (age - 12 > 0 && unit === '2') {
      return '月份不可超过12'
    }
    if (age - 31 > 0 && unit === '3') {
      return '天数不可超过31'
    }
  }
  return false
}
export const CONFIM_MESSAGE_NAME_MAP = {
  reception: '接诊',
  registration: '挂号',
}
