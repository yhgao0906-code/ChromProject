<!--
 * @Description: 快速接诊患者基本信息
 TODO 1、全键盘；2、医卫融合；3、字段对接; 4、目前没有区分编辑和读卡状态; 5、下拉选等值域需要改为字典值
 6、表单具体的校验
-->
<template>
  <div class="patient-basic-info">
    <el-form
      ref="formRef"
      inline
      :disabled="disabled"
      :model="form"
      :rules="formRules"
      :show-message="false"
      :label-width="labelWidth"
      :validate-on-rule-change="false"
      class="ima-v5-d-flex"
    >
      <el-form-item label="就诊卡号" prop="visitCardNo">
        <haic-input
          ref="visitCardNoRef"
          clearable
          v-model.trim="form.visitCardNo"
          placeholder="请输入"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElInputComp({
              field: 'visitCardNo',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <el-form-item label="证件类型" prop="identityNo">
        <div class="identity-type ima-v5-d-flex">
          <div class="identity-type__identity ima-v5-flex-1 ima-v5-flex-between">
            <el-select
              :disabled="idCardDisabled"
              clearable
              v-model.trim="form.identityTypeCode"
              style="width: 90px"
              class="ima-v5-mr-mini"
              @change="handleIdentityChange"
              v-keyboard-element="{
                lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
                  field: 'identityTypeCode',
                  getFormRef: () => {
                    return this.$refs.formRef
                  },
                }),
              }"
            >
              <el-option
                v-for="item in IDENTITY_TYPE_OPTIONS"
                :key="item.code"
                :label="item.name"
                :value="item.code"
              />
            </el-select>
            <haic-input
              :disabled="idCardDisabled"
              class="ima-v5-flex-1"
              clearable
              v-model.trim="form.identityNo"
              @change="handleIdentityChange"
              v-keyboard-element="{
                lifecycleOption: keyboardLifecycleConfig.setElInputComp({
                  field: 'identityNo',
                  getFormRef: () => {
                    return this.$refs.formRef
                  },
                }),
              }"
            />
          </div>
          <!-- 门诊创建档案checkbox -->
          <ph-create-archive-checkbox
            v-if="isOpenArchive"
            ref="createArchiveCheckboxRef"
            :disabled="idCardDisabled"
            :checked.sync="form.checked"
            :resident-id-dep-code="residentIdDepCodeForPh"
            :resident-id-dep-name="residentIdDepNameForPh"
          />
          <!-- <el-checkbox class="ima-v5-ml-mini" v-model="form.checked">档案</el-checkbox> -->
        </div>
      </el-form-item>
      <el-form-item label="患者姓名" prop="patientName">
        <div class="ima-v5-d-flex">
          <haic-input
            clearable
            v-model.trim="form.patientName"
            placeholder="请输入"
            :disabled="nameDisabled"
            v-keyboard-element="{
              lifecycleOption: keyboardLifecycleConfig.setPatientName({
                field: 'patientName',
                getFormRef: () => {
                  return this.$refs.formRef
                },
              }),
            }"
          />
          <haic-button
            level="2"
            size="medium"
            class="ima-v5-ml-mini"
            @click="nameEditHandler"
            :disabled="nameEditBtnDisable"
            >修改</haic-button
          >
        </div>
      </el-form-item>
      <!-- 患者性别（包含是否孕产妇） -->
      <el-form-item label="患者性别" prop="sexCode">
        <div class="ima-v5-flex-between">
          <el-select
            clearable
            v-model="form.sexCode"
            class="ima-v5-flex-1"
            v-keyboard-element="{
              lifecycleOption: keyboardLifecycleConfig.setSexCode({
                field: 'sexCode',
                getFormRef: () => {
                  return this.$refs.formRef
                },
              }),
            }"
          >
            <!-- :disabled="isReadCardFlag" -->
            <el-option
              v-for="item in SEX_OPTIONS"
              :key="item.code"
              :value="item.code"
              :label="item.name"
            />
          </el-select>
          <el-checkbox
            v-if="form.sexCode === '2'"
            v-model="form.pregnancyFlag"
            label="孕产妇"
            true-label="1"
            false-label="0"
            class="ima-v5-ml-mini"
            style="width: 90px"
          />
        </div>
      </el-form-item>
      <!-- 出生日期 -->
      <el-form-item label="出生日期" prop="birthday">
        <el-date-picker
          ref="birthdayRef"
          clearable
          v-model.trim="form.birthday"
          value-format="yyyy-MM-dd"
          format="yyyy-MM-dd"
          :picker-options="birthdayPickerOptions"
          @change="handleBirthdayChange"
          placeholder="请输入"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setBirthday({
              field: 'birthday',
              getBirthdayRef: () => {
                return this.$refs.birthdayRef
              },
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>

      <!-- 年龄 -->
      <el-form-item label="年龄" prop="age1FValue">
        <div class="age ima-v5-d-flex">
          <div class="ima-v5-d-flex ima-v5-flex-1" style="margin-right: 2px">
            <el-form-item class="ima-v5-flex-1" prop="age1FValue">
              <haic-input-number
                clearable
                placeholder="请输入"
                v-model.number.trim="form.age1FValue"
                :min="0"
                :step="1"
                :step-strictly="true"
                :controls="false"
                @change="handleAgeChange('age1FValue')"
                v-keyboard-element="{
                  lifecycleOption: keyboardLifecycleConfig.setAge1FValue({
                    field: 'age1FValue',
                    getFormRef: () => {
                      return this.$refs.formRef
                    },
                  }),
                }"
              />
            </el-form-item>
            <el-form-item prop="age1FCode" style="width: 56px; margin-left: 4px">
              <el-select
                clearable
                v-model="form.age1FCode"
                class="age-unit ima-v5-mr-mini"
                @change="handleAgeChange('age1FCode')"
                v-keyboard-element="{
                  lifecycleOption: keyboardLifecycleConfig.setAge1FCode({
                    field: 'age1FCode',
                    getFormRef: () => {
                      return this.$refs.formRef
                    },
                  }),
                }"
              >
                <el-option
                  v-for="item in AGE_UNIT_OPTIONS"
                  :key="item.code"
                  :label="item.name"
                  :value="item.code"
                  :disabled="age1FDisabled(item.code)"
                />
              </el-select>
            </el-form-item>
          </div>
          <div class="ima-v5-d-flex ima-v5-flex-1" style="margin-left: 2px">
            <el-form-item class="ima-v5-flex-1" prop="ageSecValue">
              <haic-input-number
                :disabled="form.age1FCode === '3' || ageSecDisable"
                clearable
                placeholder="请输入"
                v-model.number.trim="form.ageSecValue"
                :min="0"
                :step="1"
                :step-strictly="true"
                :controls="false"
                @change="handleAgeChange('ageSecValue')"
                v-keyboard-element="{
                  lifecycleOption: keyboardLifecycleConfig.setAgeSecValue({
                    field: 'ageSecValue',
                    getFormRef: () => {
                      return this.$refs.formRef
                    },
                  }),
                }"
              />
            </el-form-item>
            <el-form-item prop="ageSecCode" style="width: 56px; margin-left: 4px">
              <el-select
                :disabled="form.age1FCode === '3' || ageSecDisable"
                clearable
                v-model="form.ageSecCode"
                @change="handleAgeChange('ageSecCode')"
                v-keyboard-element="{
                  lifecycleOption: keyboardLifecycleConfig.setAgeSecCode({
                    field: 'ageSecCode',
                    getFormRef: () => {
                      return this.$refs.formRef
                    },
                  }),
                }"
              >
                <el-option
                  v-for="item in AGE_UNIT_OPTIONS"
                  :key="item.code"
                  :label="item.name"
                  :value="item.code"
                  :disabled="ageSecUnitCodeDisabled(item.code)"
                />
              </el-select>
            </el-form-item>
          </div>
        </div>
      </el-form-item>
      <!-- 本人电话 -->
      <el-form-item label="本人电话" prop="telephone">
        <haic-input
          clearable
          v-model.trim="form.telephone"
          placeholder="请输入"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setTelephone({
              field: 'telephone',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <!-- 联系人 -->
      <!-- 联系人关系 -->
      <el-form-item label="联系人" prop="contactName">
        <div class="contact-person">
          <el-form-item class="contact-person__name" prop="contactName">
            <haic-input
              clearable
              placeholder="请输入"
              v-model.trim="form.contactName"
              class="ima-v5-mr-mini"
              v-keyboard-element="{
                lifecycleOption: keyboardLifecycleConfig.setContactName({
                  field: 'contactName',
                  getFormRef: () => {
                    return this.$refs.formRef
                  },
                }),
              }"
            />
          </el-form-item>
          <el-form-item class="contact-person__relation ima-v5-ml-mini" prop="contactRelationCode">
            <el-select
              clearable
              v-model.trim="form.contactRelationCode"
              v-keyboard-element="{
                lifecycleOption: keyboardLifecycleConfig.setContactRelationCode({
                  field: 'contactRelationCode',
                  getFormRef: () => {
                    return this.$refs.formRef
                  },
                }),
              }"
            >
              <el-option
                v-for="item in CONTACT_RALATION_OPTIONS"
                :key="item.code"
                :label="item.name"
                :value="item.code"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form-item>
      <!-- 联系人电话 -->
      <el-form-item label="联系人电话" prop="contactTelephone">
        <haic-input
          clearable
          placeholder="请输入"
          v-model.trim="form.contactTelephone"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setContactTelephone({
              field: 'contactTelephone',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <!-- 现住址 -->
      <el-form-item label="现住址" prop="livingAddress" style="width: 66.66%">
        <haic-address-input
          :readPlaceholder="true"
          v-model="form.livingAddress"
        ></haic-address-input>
      </el-form-item>
      <!-- 患者归属 -->
      <el-form-item label="患者归属" prop="comeFromCode">
        <el-select
          clearable
          filterable
          v-model="form.comeFromCode"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setComeFromCode({
              field: 'comeFromCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in PATIENT_AFFILIATION_OPTIONS"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
      <!-- 户籍地址 -->
      <el-form-item label="户籍地址" prop="householdFullAddress" style="width: 66.66%">
        <haic-input
          clearable
          placeholder="请输入"
          v-model.trim="form.householdFullAddress"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setHouseholdFullAddress({
              field: 'householdFullAddress',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <!-- 国籍 -->
      <el-form-item label="国籍" prop="nationalityCode">
        <el-select
          clearable
          filterable
          v-model="form.nationalityCode"
          placeholder="请选择"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'nationalityCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in NATIONALITY_OPTIONS"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>

      <!-- 婚姻状况 -->
      <el-form-item label="婚姻" prop="maritalCode">
        <el-select
          clearable
          filterable
          v-model="form.maritalCode"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'maritalCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in MARITAL_OPTIONS"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
      <!-- 民族 -->
      <el-form-item label="民族" prop="nationalCode">
        <el-select
          clearable
          v-model.trim="form.nationalCode"
          filterable
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'nationalCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in NATIONAL_OPTIONS"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
      <!-- 文化程度 -->
      <el-form-item label="文化程度" prop="educationCode">
        <el-select
          clearable
          filterable
          v-model.trim="form.educationCode"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'educationCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in EDUCATION_OPTIONS"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
      <!-- 职业 -->
      <el-form-item label="职业" prop="careerTypeCode">
        <el-select
          clearable
          filterable
          v-model.trim="form.careerTypeCode"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElSelectComp({
              field: 'careerTypeCode',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        >
          <el-option
            v-for="item in CAREER_TYPE_OPTIONS"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
      <!-- 工作单位 -->
      <el-form-item label="工作单位" prop="companyName">
        <haic-input
          clearable
          placeholder="请输入"
          v-model.trim="form.companyName"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElInputComp({
              field: 'companyName',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <!-- 代办人联系电话 -->
      <el-form-item label="代办人联系电话" prop="agenterTelephone">
        <haic-input
          clearable
          placeholder="请输入"
          v-model.trim="form.agenterTelephone"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElInputComp({
              field: 'agenterTelephone',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <!-- 代办人身份证号 -->
      <el-form-item label="代办人身份证号" prop="agenterIdentityCard">
        <haic-input
          clearable
          placeholder="请输入"
          v-model.trim="form.agenterIdentityCard"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElInputComp({
              field: 'agenterIdentityCard',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <!-- 代办人姓名 -->
      <el-form-item label="代办人姓名" prop="agenterName">
        <haic-input
          clearable
          placeholder="请输入"
          v-model.trim="form.agenterName"
          v-keyboard-element="{
            lifecycleOption: keyboardLifecycleConfig.setElInputComp({
              field: 'agenterName',
              getFormRef: () => {
                return this.$refs.formRef
              },
            }),
          }"
        />
      </el-form-item>
      <slot name="suffix"></slot>
    </el-form>
  </div>
</template>

<script>
// TODO 以下与身份证相关的计算方法后面会提取到组件市场
import {
  IdentityCodeValid,
  // getSex,
  getBirth,
  // getAgeSexBirthByIdcard,
  // getAgeAndUnitByBirthday,
  // monthDayDiff,
} from '@/utils/idcard'
import { telephoneRule } from '@haic/common-utils/validate'
import { getAgeUnitByBirthday, getSexBirthByIdcard, concatObjArray, validMouth } from '../../util'
import moment from 'moment'
import cloneDeep from 'lodash/cloneDeep'
import * as keyboardLifecycleConfig from '../../keyboard-config'
import { isPySys, isOpenArchive, idCardTypeMap } from '@/remotes/ph-helper'
import { PhCreateArchiveCheckbox } from '@/remotes/ph-mix'

class Form {
  // 是否创建档案
  checked = true
  visitCardNo = ''
  /** 事件id */
  eventId = ''
  id = ''
  /** 患者mdmPatientId */
  mdmPatientId = ''
  /** 患者姓名 */
  patientName = ''
  /** 性别 */
  sexCode = ''
  sexName = ''
  /** 出生日期 */
  birthday = ''
  /** 年龄 */
  age1FValue = undefined
  /** 年龄单位 */
  age1FCode = ''
  age1FName = ''
  ageSecCode = ''
  ageSecName = ''
  ageSecValue = undefined
  /** 证件类型 */
  identityTypeCode = '01'
  identityTypeName = ''
  /** 证件号码 */
  identityNo = ''
  // patientIdNumber = ''
  /* 实际居住地址 */
  livingFullAddress = ''
  currentAddressLinkageCode = ''
  currentAddressLinkageName = ''
  livingAddress = {
    province: {
      code: '',
      name: '',
    },
    city: {
      code: '',
      name: '',
    },
    district: {
      code: '',
      name: '',
    },
    street: {
      code: '',
      name: '',
    },
    community: {
      code: '',
      name: '',
    },
    address: '',
    codes: [],
    names: [],
  }
  /** 本人电话 */
  telephone = ''
  /** 联系人姓名 */
  contactName = ''
  /** 联系人关系代码 */
  contactRelationCode = ''
  /** 联系人关系名称 */
  contactRelationName = ''
  /** 联系人电话 */
  contactTelephone = ''
  /** 民族 */
  nationalCode = ''
  nationalName = ''
  /** 国籍 */
  nationalityCode = ''
  nationalityName = ''
  /** 婚姻状况 */
  maritalCode = ''
  maritalName = ''
  /** 职业 */
  careerTypeCode = ''
  careerTypeName = ''
  /** 工作单位 */
  companyName = ''
  /** 户籍地址（分为结构化或者非结构化） */
  householdFullAddress = ''
  /** 患者归属 */
  comeFromCode = ''
  comeFromName = ''
  /** 文化程度 */
  educationCode = ''
  educationName = ''
  // TODO 暂时去掉
  /** 是否孕产妇 */
  pregnancyFlag = '0'
  /** 创建档案-医卫融合 */

  /** 代办人身份证号 */
  agenterIdentityCard = ''
  /** 代办人姓名 */
  agenterName = ''
  /** 代办人联系电话 */
  agenterTelephone = ''
  constructor(val, isEdit) {
    if (val && Object.keys(val).length) {
      let info = cloneDeep(val)
      for (let key in info) {
        if (['currentAddressLinkageCode', 'currentAddressLinkageName'].includes(key)) {
          this.livingAddress = {
            codes: info.currentAddressLinkageCode?.split('|'),
            names: info.currentAddressLinkageName?.split('|'),
            address: info.livingFullAddress,
          }
        } else if (['age1FValue', 'ageSecValue'].includes(key)) {
          this[key] = info[key] || info[key] === 0 ? info[key] : undefined
        } else {
          this[key] = info[key]
        }
      }
      if (!isEdit) {
        // 搜索患者不携带pregnancyFlag
        this.pregnancyFlag = '0'
      }
    }
  }
}

export default {
  name: 'QuickAcceptPatientBasicInfo',

  components: {
    PhCreateArchiveCheckbox,
  },

  props: {
    labelWidth: {
      type: String,
      default: '120px',
    },
    visible: {
      type: Boolean,
      default: false,
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
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    const checkIdNo = (rule, value, callback) => {
      if (this.form?.identityTypeCode === '01' && value) {
        const ret = IdentityCodeValid(value)
        if (!ret.pass) {
          return callback(new Error(ret.tip))
        }
      }
      return callback()
    }
    const checkIdCard = (rule, value, callback) => {
      if (value) {
        const ret = IdentityCodeValid(value)
        if (!ret.pass) {
          return callback(new Error(ret.tip))
        }
      }
      return callback()
    }
    const checkAge1F = (rule, value, callback) => {
      if (value || value === 0) {
        const mes = validMouth(this.form?.age1FValue, this.form?.age1FCode)
        if (mes) {
          return callback(new Error(mes))
        }
        return callback()
      }
      return callback()
    }
    const checkAgeSec = (rule, value, callback) => {
      if (value || value === 0) {
        const mes = validMouth(this.form.ageSecValue, this.form.ageSecCode)
        if (mes) {
          return callback(new Error(mes))
        }
        return callback()
      }
      return callback()
    }

    const zjlx = this.$_VDict.getCode().CLASS_OF_POPULATION.TYPE_OF_ID_DOCUMENT
    this.IDENTITY_TYPE_OPTIONS = this.$_VDict.getDict(zjlx) // 证件类型

    const lxrgx = this.$_VDict.getCode().POPULATION_ECONOMIC_CLASS.CONTACT_RELATIONSHIP_CODE
    this.CONTACT_RALATION_OPTIONS = this.$_VDict.getDict(lxrgx) // 联系人关系

    const ageCode = this.$_VDict.getCode().CLASS_OF_POPULATION.AGE_UNIT
    this.AGE_UNIT_OPTIONS = this.$_VDict.getDict(ageCode) // 年龄单位

    const mzCode = this.$_VDict.getCode().CLASS_OF_POPULATION.ETHNIC_CODE
    this.NATIONAL_OPTIONS = this.$_VDict.getDict(mzCode) // 民族

    const hyzkCode = this.$_VDict.getCode().CLASS_OF_POPULATION.MARRIAGE_CODE
    this.MARITAL_OPTIONS = this.$_VDict.getDict(hyzkCode) // 婚姻状况

    const whcdCode = this.$_VDict.getCode().POPULATION_ECONOMIC_CLASS.MAXIMUM_EDUCATION_CODE
    this.EDUCATION_OPTIONS = this.$_VDict.getDict(whcdCode) // 文化程度

    const hzlyCode = this.$_VDict.getCode().ADMINISTRATIVE_DIVISIONS.SOURCE_OF_PATIENT
    this.PATIENT_AFFILIATION_OPTIONS = this.$_VDict.getDict(hzlyCode) // 患者归属

    const sexCode = this.$_VDict.getCode().CLASS_OF_POPULATION.GENDER_CODE
    this.SEX_OPTIONS = this.$_VDict.getDict(sexCode) // 性别

    const zyCode = this.$_VDict.getCode().POPULATION_ECONOMIC_CLASS.PATIENT_OCCUPATION_CODE
    this.CAREER_TYPE_OPTIONS = this.$_VDict.getDict(zyCode) // 职业

    const gjCode = this.$_VDict.getCode().CLASS_OF_POPULATION.NAMES_COUNTRIES_REGIONS_AROUND_WORLD
    this.NATIONALITY_OPTIONS = this.$_VDict.getDict(gjCode) // 国籍

    return {
      form: new Form(),
      isNameEdit: true,
      defaultAge: '7',
      options: [],
      defaultRules: {
        identityNo: [{ validator: checkIdNo, trigger: 'blur' }],
        agenterIdentityCard: [{ validator: checkIdCard, trigger: 'blur' }],
        age1FValue: [{ validator: checkAge1F, trigger: 'change' }],
        age1FCode: [{ validator: checkAge1F, trigger: 'blur' }],
        ageSecValue: [{ validator: checkAgeSec, trigger: 'change' }],
        ageSecCode: [{ validator: checkAgeSec, trigger: 'blur' }],
        telephone: [
          {
            validator: telephoneRule,
            trigger: 'blur',
          },
        ],
        contactTelephone: [
          {
            validator: telephoneRule,
            trigger: 'blur',
          },
        ],
        agenterTelephone: [
          {
            validator: telephoneRule,
            trigger: 'blur',
          },
        ],
      },
      birthdayPickerOptions: {
        disabledDate(date) {
          return moment(date).isAfter(moment(), 'day')
        },
      },
      keyboardLifecycleConfig,
      // 公卫创建档案使用
      isOpenArchive: false,
      residentIdDepCodeForPh: '',
      residentIdDepNameForPh: '',
    }
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
      handler(val) {
        if (!val || !Object.keys(val).length) return
        this.isNameEdit = true
        this.handleDetail(val)
      },
      // immediate: true,
      deep: true,
    },
  },
  computed: {
    formRules() {
      if (!this.rules || !Object.keys(this.rules).length) {
        return {}
      }
      const formKeys = Object.keys(this.form)
      let targetRules = Object.keys(this.rules)
        .filter((key) => formKeys.includes(key))
        .reduce((rule, key) => {
          rule[key] = this.rules[key]
          return rule
        }, {})

      return concatObjArray(cloneDeep(this.defaultRules), targetRules)
    },
    idCardDisabled() {
      return !!this.basic?.mdmPatientId && !!this.basic.identityNo
    },
    // 姓名输入域是否禁用
    nameDisabled() {
      return this.isNameEdit ? !!this.basic?.mdmPatientId : false
    },
    ageSecDisable() {
      return this.defaultAge
        ? this.form.age1FValue - this.defaultAge >= 0 && this.form.age1FCode === '1'
        : false
    },
    //姓名旁编辑按钮是否禁用
    nameEditBtnDisable() {
      if (this.disabled) return true
      if (!this.isEdit) {
        return !this.basic?.mdmPatientId
      }
      return false
    },
  },
  mounted() {},
  methods: {
    focusVisitCardNo() {
      const visitCardNoNode = this.$refs.visitCardNoRef
      if (visitCardNoNode && visitCardNoNode.focus && typeof visitCardNoNode.focus === 'function') {
        visitCardNoNode.focus()
      }
    },
    nameEditHandler() {
      if (this.basic?.mdmPatientId) {
        this.isNameEdit = false
      }
    },
    async handleDetail() {
      this.form = new Form(this.basic, this.isEdit)
      if (!this.isEdit) {
        // 快速接诊回显的时候 需要重新计算
        if (this.form?.birthday) {
          this.handleBirthdayChange()
        } else if (this.form.patientIdNumber) {
          this.patientIdNumberChange({ patientIdNumber: this.form.patientIdNumber })
        } else if (this.form.identityNo) {
          this.patientIdNumberChange({ patientIdNumber: this.form.identityNo })
        }
      }
      await this.$nextTick()
      this.clearValidate()
    },
    handleIdentityChange() {
      if (this.form.identityTypeCode === '01') {
        this.patientIdNumberChange({ patientIdNumber: this.form.identityNo })
        this.form.patientIdNumber = this.form.identityNo
      }
      const data = idCardTypeMap(this.form)
      this.residentIdDepCodeForPh = data?.residentIdDepCode || ''
      this.residentIdDepNameForPh = data?.residentIdDepName || ''
    },

    patientIdNumberChange({ patientIdNumber }) {
      // 从身份证号码中计算年龄与生日
      if (!IdentityCodeValid(patientIdNumber).pass) return
      let { birth, sex } = getSexBirthByIdcard(patientIdNumber)
      this.form.birthday = birth
      this.form.sexCode = sex.toString()
      let ageInfo = getAgeUnitByBirthday(this.$moment(birth).valueOf(), this.defaultAge)
      for (let key in ageInfo) {
        this.form[key] =
          ageInfo[key] || ageInfo[key] === 0 || ageInfo[key] === undefined ? ageInfo[key] : ''
      }
    },
    age1FDisabled(code) {
      if (
        (this.form.age1FValue || this.form.age1FValue === 0) &&
        ((this.form.age1FValue - 12 > 0 && code === '2') ||
          (this.form.age1FValue - 30 > 0 && code === '3'))
      ) {
        return true
      }

      return false
    },
    ageSecUnitCodeDisabled(code) {
      if (this.form.age1FCode === '1') {
        return code !== '2'
      } else if (this.form.age1FCode === '2') {
        return code !== '3'
      } else if (this.form.age1FCode === '3') {
        return true
      } else if (
        (this.form?.ageSecValue || this.form?.ageSecValue === 0) &&
        ((this.form.ageSecValue - 12 > 0 && code === '2') ||
          (this.form.ageSecValue - 30 > 0 && code === '3'))
      ) {
        return true
      }
    },
    async initSwitchs() {
      const switchModule = window.__haicApp__.getContext('switchModule')
      const targetSwitchCode = switchModule.getSwitchCodeMap().OUT.AGE_CALC_METHOD_CODE
      const switchData = await switchModule.getSwitchValue(targetSwitchCode)
      if (switchData?.[targetSwitchCode]) {
        this.defaultAge = switchData?.[targetSwitchCode] || '7'
      }

      // 公卫系统厂商和项目
      if (await isPySys()) {
        // 门诊挂号登记是否启用“建档”功能（EXT021）
        this.isOpenArchive = await isOpenArchive()
      }
    },

    init() {
      this.isNameEdit = true
      this.initSwitchs()
      this.$nextTick(() => {})
    },
    //
    handleReset() {
      this.isNameEdit = true
      this.form = new Form()
      this.$refs.formRef?.resetFields()
    },
    clearValidate() {
      this.$refs?.formRef?.clearValidate()
    },
    async getFormData() {
      const isValid = await this.validateForm()
      if (!isValid) return false
      return this.handleParams()
    },
    handleParams() {
      let target = cloneDeep(this.form)
      target.currentAddressLinkageCode = (target?.livingAddress?.codes || []).join('|')
      target.currentAddressLinkageName = (target?.livingAddress?.names || []).join('|')
      target.livingFullAddress = target.livingAddress.address
      target.sexName = this.SEX_OPTIONS.find((o) => o.code === target.sexCode)?.name || ''
      target.identityTypeName =
        this.IDENTITY_TYPE_OPTIONS.find((o) => o.code === target.identityTypeCode)?.name || ''
      target.contactRelationName =
        this.CONTACT_RALATION_OPTIONS.find((o) => o.code === target.contactRelationCode)?.name || ''
      target.nationalName =
        this.NATIONAL_OPTIONS.find((o) => o.code === target.nationalCode)?.name || ''
      target.nationalityName =
        this.NATIONALITY_OPTIONS.find((o) => o.code === target.nationalityCode)?.name || ''
      target.maritalName =
        this.MARITAL_OPTIONS.find((o) => o.code === target.maritalCode)?.name || ''
      target.careerTypeName =
        this.CAREER_TYPE_OPTIONS.find((o) => o.code === target.careerTypeCode)?.name || ''
      target.comeFromName =
        this.PATIENT_AFFILIATION_OPTIONS.find((o) => o.code === target.comeFromCode)?.name || ''
      target.educationName =
        this.EDUCATION_OPTIONS.find((o) => o.code === target.educationCode)?.name || ''
      target.pregnancyFlag = target.sexCode === '2' ? target.pregnancyFlag : null
      ;[('age1FValue', 'ageSecValue')].forEach((o) => {
        if (this.form[o] === undefined) {
          target[o] = ''
        }
      })
      return target
    },
    validateForm() {
      return new Promise((resolve) => {
        this.$refs.formRef.validate((valid) => {
          resolve(valid)
        })
      })
    },

    //年龄或者年龄单位改变
    handleAgeChange(key) {
      // 情况相关数据
      if (['age1FCode'].includes(key)) {
        this.form.ageSecValue = undefined
        this.form.ageSecCode = ''
        this.form.ageSecName = ''
      }
      this.$refs.formRef.validateField(key)
      const { age1FValue, age1FCode, ageSecValue, ageSecCode } = this.form
      // 计算生日
      if (this.form.identityTypeCode === '01' && this.form.identityNo) {
        const { birth } = getBirth(this.form.identityNo)
        this.form.birthday = birth
      } else {
        let now = window.__haicApp__.__TOOLKITS__?.networkClock?.getCurrentTime() || Date.now()
        let birthday
        let unitMap = {
          1: 'year',
          2: 'month',
          3: 'day',
        }
        if (age1FValue && age1FCode) {
          birthday = this.$moment(now).subtract(age1FValue, unitMap[age1FCode])
        }
        if (ageSecValue && ageSecCode) {
          birthday = this.$moment(birthday).subtract(ageSecValue, unitMap[ageSecCode])
        }
        this.form.birthday = birthday ? birthday.startOf('day').format('YYYY-MM-DD') : ''
      }
    },
    //  出生日期改变
    handleBirthdayChange() {
      this.calcAgeByBirth()
    },
    // 根据出生日期计算年龄
    calcAgeByBirth() {
      const { age1FValue, age1FCode, age1FName, ageSecValue, ageSecCode, ageSecName } =
        getAgeUnitByBirthday(this.$moment(this.form.birthday).valueOf(), this.defaultAge) || {}
      this.form.age1FValue = age1FValue
      this.form.age1FCode = age1FCode
      this.form.age1FName = age1FName
      this.form.ageSecValue = ageSecValue
      this.form.ageSecCode = ageSecCode
      this.form.ageSecName = ageSecName
    },
  },
}
</script>

<style lang="scss" scoped>
.patient-basic-info {
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
    .identity-type {
      display: flex;
      justify-content: space-between;
      width: 100%;
      .el-select {
        width: 30%;
      }
      &__identity {
        display: flex;
        flex: 1;
      }
      &__create-archive {
        width: 80px;
        margin-left: 20px;
      }
    }
    .contact-person {
      display: flex;
      width: 100%;
      &__name {
        width: 75%;
        .el-input {
          width: 100%;
        }
      }
      &__relation {
        width: 25%;
        .el-select {
          width: 100%;
        }
      }
    }
    .age {
      width: 100%;
      .el-input,
      .el-select {
        width: 100%;
      }
      .el-input-number {
        width: 100%;
        .el-input__inner {
          text-align: left;
          padding-left: 8px;
        }
        .el-input {
          width: 100%;
        }
      }
    }
  }
}
</style>
