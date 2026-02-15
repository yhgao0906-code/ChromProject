/**
 * 接诊全键盘配置
 */

/**
 * 表单项校验方法
 * @param {*} formRef 表单vm
 * @param {*} validField 表单项字段
 * @returns
 */

const validatorUtil = (formRef, validField) => {
  if (!formRef) return
  const rules = formRef.rules || {}

  const keyList = Object.keys(rules)
  if (!keyList.includes(validField)) return
  return new Promise((resolve) => {
    formRef.validateField(validField, (valid) => {
      resolve(valid)
    })
  })
}

// 患者姓名
export const setPatientName = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 患者性别
export const setSexCode = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 出生日期
export const setBirthday = ({ getBirthdayRef, getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: () => {},
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: () => {
        const dataPickerVm = getBirthdayRef?.()
        if (dataPickerVm) {
          dataPickerVm.hidePicker()
        }
      },
    },
  }
}

// 年龄1
export const setAge1FValue = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async (vm) => {
        if (vm && vm?.$children?.[0] && vm?.$children?.[0].blur) vm.$children[0].blur()
        if (vm && vm.focus) vm.focus()
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 年龄1 - 单位
export const setAge1FCode = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 年龄2
export const setAgeSecValue = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async (vm) => {
        if (vm && vm?.$children?.[0] && vm?.$children?.[0].blur) vm.$children[0].blur()
        if (vm && vm.focus) vm.focus()
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 年龄2 - 单位
export const setAgeSecCode = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 本人联系电话
export const setTelephone = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 联系人
export const setContactName = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 联系人关系说明
export const setContactRelationCode = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 联系人电话
export const setContactTelephone = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 患者归属
export const setComeFromCode = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 户籍地址
export const setHouseholdFullAddress = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 国籍
export const setNationalityCode = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 通用el-input控件
export const setElInputComp = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
    },
  }
}

// 通用el-select控件
export const setElSelectComp = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {
      openField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: (vm) => {
        if (vm) {
          vm.toggleMenu()
        }
      },
    },
  }
}

// 通用el-button控件
export const setElButtonComp = ({ clickHandler }) => {
  return {
    beforeEnter: {},
    enter: {
      clickField: async () => {
        await clickHandler()
      },
    },
    beforeLeave: {},
  }
}

// TODO:不生效 remark
export const setRemarkComp = ({ getFormRef, field }) => {
  return {
    beforeEnter: {},
    enter: {},
    beforeLeave: {
      validField: async () => {
        const valid = await validatorUtil(getFormRef(), field)
        return !valid
      },
      closeField: () => {
        let registorDom = document
          ?.getElementById('registerButtonRef')
          ?.getElementsByTagName('button')?.[0]
        if (registorDom) {
          registorDom.focus()
        }
      },
    },
  }
}
