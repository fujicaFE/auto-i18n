<template>
  <div class="app-container">
    <el-main>
      <el-tabs v-model="activeName" @tab-click="changeTabs">
        <el-tab-pane
          :label="$t('爱泊客设置')"
          name="aiboke"
          v-if="filterButton('systemConfig_aiboke')"
        >
          <el-form label-width="200px" :model="form" ref="aiboke">
            <el-row class="mb-20">
              <span class="list-title">{{ $t('缴费配置') }}</span>
            </el-row>
            <el-row>
              <el-form-item
                label="订单有效时间:"
                prop="orderValidTime"
                :rules="[
                  requireRule,
                  numberRule,
                  {
                    validator: (rule, value, callback) =>
                      rangeFun(rule, value, callback, 1, 100),
                    trigger: 'change',
                  },
                ]"
              >
                <el-input
                  class="minput"
                  maxlength="5"
                  v-model.trim="form.orderValidTime"
                  :placeholder="$t('请输入订单有效时间')"
                />{{ $t('分钟') }}</el-form-item
              >
            </el-row>
            <span class="tip">{{
              $t(
                '注：设置场内缴费订单有效时间后，场内缴费的订单按有效时间进行过期处理',
              )
            }}</span>
            <el-form-item
              label="微信小程序appid:"
              prop="aibokeAppid"
              :rules="[requireRule]"
            >
              <el-input
                class="minput"
                maxlength="100"
                v-model.trim="form.aibokeAppid"
                :placeholder="$t('请输入微信小程序appid')"
              />
            </el-form-item>
            <el-form-item
              label="微信小程序appsecret:"
              prop="aibokeAppsecret"
              :rules="[requireRule]"
            >
              <el-input
                class="minput"
                maxlength="100"
                v-model.trim="form.aibokeAppsecret"
                :placeholder="$t('请输入微信小程序appsecret')"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane
          :label="$t('富利商设置')"
          name="fulishang"
          v-if="filterButton('systemConfig_fulishang')"
        >
          <el-row class="mb-20">
            <span class="list-title">{{ $t('缴费配置') }}</span>
          </el-row>
          <el-form label-width="200px" :model="form" ref="fulishang">
            <el-form-item
              label="微信小程序appid:"
              prop="fulishangAppid"
              :rules="[requireRule]"
            >
              <el-input
                class="minput"
                maxlength="100"
                v-model.trim="form.fulishangAppid"
                :placeholder="$t('请输入微信小程序appid')"
              />
            </el-form-item>
            <el-form-item
              label="微信小程序appsecret:"
              prop="fulishangAppsecret"
              :rules="[requireRule]"
            >
              <el-input
                class="minput"
                maxlength="100"
                v-model.trim="form.fulishangAppsecret"
                :placeholder="$t('请输入微信小程序appsecret')"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane
          :label="$t('登录页配置')"
          name="login"
          v-if="filterButton('systemConfig_login')"
        >
          <el-row class="mb-20">
            <span class="list-title">{{
              $t('富士行云客户运营管理平台登录页设置')
            }}</span>
          </el-row>
          <el-form label-width="200px" :model="form" ref="login">
            <el-row>
              <el-form-item
                label="平台名称:"
                prop="platformName"
                :rules="[requireRule]"
              >
                <el-input
                  maxlength="20"
                  v-model.trim="form.platformName"
                  :placeholder="$t('请输入平台名称')"
                />
              </el-form-item>
            </el-row>

            <el-form-item
              label="网站域名:"
              prop="domain"
              :rules="[requireRule]"
            >
              <el-input
                v-model.trim="form.domain"
                maxlength="100"
                :placeholder="$t('请输入网站域名')"
              />
            </el-form-item>
            <el-form-item
              label="网站图标:"
              prop="absolutewebIcon"
              multiple="false"
              accept="png"
              :rules="[
                { required: true, message: '请上传图标', trigger: 'blur' },
              ]"
            >
              <el-upload
                :on-change="(e) => onChange(e, 'webIcon')"
                :auto-upload="false"
                :on-success="(res) => handleSuccess(res, 'webIcon')"
                :show-file-list="false"
              >
                <img
                  v-if="form.absolutewebIcon"
                  style="max-width: 500px"
                  :src="form.absolutewebIcon"
                  class="avatar"
                />
                <el-button v-else size="small" type="primary">{{
                  $t('上传文件')
                }}</el-button>
              </el-upload>
            </el-form-item>
            <div class="tip">
              {{ $t('( 请上传.png格式图片，最大支持 500KB )') }}
            </div>
            <el-form-item
              label="平台logo:"
              prop="absolutelogo"
              :rules="[
                { required: true, message: '请上传logo', trigger: 'blur' },
              ]"
            >
              <el-upload
                :on-change="(e) => onChange(e, 'logo')"
                :auto-upload="false"
                :on-success="(res) => handleSuccess(res, 'logo')"
                :show-file-list="false"
              >
                <img
                  v-if="form.absolutelogo"
                  style="max-width: 500px"
                  :src="form.absolutelogo"
                  class="avatar"
                />
                <el-button v-else size="small" type="primary">{{
                  $t('上传文件')
                }}</el-button>
              </el-upload>
            </el-form-item>
            <div class="tip">
              {{ $t('( 请上传.png格式图片，最大支持 500KB )') }}
            </div>
            <el-form-item
              label="登录页欢迎语:"
              prop="welcomeText"
              :rules="[requireRule]"
            >
              <el-input
                v-model.trim="form.welcomeText"
                maxlength="100"
                :placeholder="$t('请输入登录页欢迎语')"
              />
            </el-form-item>
            <el-form-item
              label="登录页背景颜色:"
              prop="backColor"
              :rules="[requireRule]"
            >
              <el-input
                v-model.trim="form.backColor"
                maxlength="100"
                :placeholder="$t('请输入登录页背景颜色')"
              />
            </el-form-item>

            <el-form-item
              label=" 登录页背景图片:"
              prop="absolutebackImg"
              :rules="[requireRule]"
            >
              <el-upload
                :on-change="(e) => onChange(e, 'backImg')"
                :auto-upload="false"
                :on-success="(res) => handleSuccess(res, 'backImg')"
                :show-file-list="false"
              >
                <img
                  v-if="form.absolutebackImg"
                  style="max-width: 500px"
                  :src="form.absolutebackImg"
                  class="avatar"
                />
                <el-button v-else size="small" type="primary">{{
                  $t('上传文件')
                }}</el-button>
              </el-upload>
            </el-form-item>
            <div class="tip">
              {{ $t('( 请上传.png/.jpg/.jpeg格式图片，最大支持 2MB )') }}
            </div>
          </el-form>
        </el-tab-pane>
        <el-tab-pane
          :label="$t('服务临逾期配置')"
          name="service"
          v-if="filterButton('systemConfig_service')"
        >
          <el-row class="mb-20">
            <span class="list-title">{{ $t('服务临逾期提醒设置') }}</span>
          </el-row>
          <el-form label-width="150px" :model="form" ref="service">
            <el-form-item label="是否启用发送消息:" prop="isSend">
              <el-switch
                v-model="form.isSend"
                active-color="#13ce66"
                inactive-color="#ff4949"
              >
              </el-switch>
            </el-form-item>
            <el-row
              :gutter="20"
              v-for="(item, index) in form.overdueList"
              :key="index"
            >
              <el-col :xs="24" :sm="10" :md="10" :lg="10">
                <div>
                  <el-form-item
                    label="提醒消息模板:"
                    :prop="'overdueList.' + index + '.tipTemplate'"
                    :rules="[requireRule]"
                  >
                    <el-input
                      maxlength="100"
                      type="textarea"
                      rows="6"
                      v-model.trim="item.tipTemplate"
                      :placeholder="$t('请提醒消息模板')"
                    />
                  </el-form-item>
                </div>
              </el-col>
              <el-col :xs="24" :sm="10" :md="12" :lg="10">
                <div>
                  <el-form-item
                    label="服务临期时限:"
                    :prop="'overdueList.' + index + '.adventTime'"
                    :rules="[
                      requireRule,
                      numberRule,
                      {
                        validator: (rule, value, callback) =>
                          rangeFun(rule, value, callback, 1, 1000),
                        trigger: 'change',
                      },
                    ]"
                  >
                    <el-row>
                      <el-input
                        class="sinput"
                        maxlength="4"
                        v-model.trim="item.adventTime"
                        :placeholder="$t('服务临期时限')"
                      />
                      天
                    </el-row>
                  </el-form-item>
                  <el-form-item
                    label="通知方式:"
                    :prop="'overdueList.' + index + '.notifyMethod'"
                    :rules="[
                      { required: true, message: '请选择', trigger: 'blur' },
                    ]"
                  >
                    <el-checkbox-group v-model="item.notifyMethod">
                      <el-checkbox :label="1">{{ $t('平台公告') }}</el-checkbox>
                      <el-checkbox :label="2">{{ $t('企业邮箱') }}</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>
                  <el-form-item
                    label="短信发送时间:"
                    :prop="'overdueList.' + index + '.sendTime'"
                    :rules="[
                      { required: true, message: '请选择', trigger: 'blur' },
                    ]"
                  >
                    <el-row>
                      <el-time-select
                        v-model="item.sendTime"
                        :placeholder="$t('选择时间')"
                      >
                      </el-time-select>
                    </el-row>
                  </el-form-item>
                </div>
              </el-col>
              <el-col :xs="24" :sm="4" :md="2" :lg="4">
                <div class="item-buttons">
                  <el-button
                    class="item-button"
                    type="text"
                    size="large"
                    icon="el-icon-circle-plus"
                    @click="add(index)"
                  />
                  <el-button
                    class="item-button"
                    type="text"
                    size="large"
                    icon="el-icon-remove"
                    v-if="form.overdueList.length > 1"
                    prefix="el-icon-plus"
                    @click="reduce(index)"
                  />
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>
        <el-tab-pane
          :label="$t('其他配置')"
          name="other"
          v-if="filterButton('systemConfig_other')"
        >
          <el-row class="mb-20">
            <span class="list-title">{{ $t('其他配置') }}</span>
          </el-row>
          <el-form label-width="300px" :model="form" ref="other">
            <el-row>
              <el-form-item
                label="账号登录有效期:"
                prop="loginVaildTime"
                :rules="[
                  requireRule,
                  numberRule,
                  {
                    validator: (rule, value, callback) =>
                      rangeFun(rule, value, callback, 1, 100000),
                    trigger: 'change',
                  },
                ]"
              >
                <el-row>
                  <el-input
                    class="sinput"
                    maxlength="6"
                    v-model.trim="form.loginVaildTime"
                    :placeholder="$t('账号登录有效期')"
                  />{{ $t('分钟') }}</el-row
                >
              </el-form-item>
            </el-row>

            <el-form-item
              label="手机号码格式:"
              prop="phoneFormat"
              :rules="[requireRule]"
            >
              <el-input
                v-model.trim="form.phoneFormat"
                :placeholder="$t('请输入手机号码格式')"
              />
            </el-form-item>
            <el-form-item
              label="车牌格式:"
              prop="licenseFormat"
              :rules="[requireRule]"
            >
              <el-input
                type="textarea"
                rows="5"
                v-model.trim="form.licenseFormat"
                :placeholder="$t('请输入车牌格式')"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <el-button :loading="loading" type="primary" @click="save">{{
        $t('保存')
      }}</el-button>
    </el-main>
    <!-- <el-container> -->

    <!-- </el-container> -->
  </div>
</template>

<script>
import {
  paramconfig,
  findByModule,
  uploadfile,
  buildImageUrl,
} from '@/apiV2/systemConfig'
export default {
  name: '系统配置',
  data() {
    return {
      activeName: 'aiboke',
      form: {},
      requireRule: {
        required: true,
        message: window.$t('请输入'),
        trigger: 'change',
      },
      numberRule: {
        pattern: /^[1-9]\d*$/,
        message: window.$t('请输入正整数'),
      },
      defaultOverdue: {
        tipTemplate: window.$t(
          '尊敬的用户，您享用的XXX服务将于YYYY-YY-YY到期，为了不影响您的使用，建议您提前办理服务续期',
        ),

        adventTime: '30',
        notifyMethod: [1, 2],
        sendTime: '00:00:00',
      },
    }
  },
  methods: {
    rangeFun(rule, value, callback, min, max) {
      if (parseInt(value) >= min && parseInt(value) <= max) {
        callback()
      } else {
        callback(
          new Error(this.$t('限制') + min + '-' + max + this.$t('的正整数')),
        )
      }
    },
    onChange(file, para) {
      console.log(file)
      if (para == 'webIcon' || para == 'logo') {
        if (file.raw.type != 'image/png' || file.raw.size > 500 * 1024) {
          this.$message.error(this.$t('请上传.png格式图片，最大支持 500KB'))
          return
        }
      } else {
        if (
          !(
            file.raw.type == 'image/png' ||
            file.raw.type == 'image/jpg' ||
            file.raw.type == 'image/jpeg'
          ) ||
          file.raw.size > 2 * 1024 * 1024
        ) {
          this.$message.error(
            window.$t('请上传.png/.jpg/.jpeg格式图片，最大支持 2MB'),
          )
          return
        }
      }
      const fileData = new FormData()
      fileData.append('file', file.raw)
      uploadfile(fileData).then((res) => {
        if (res.success) {
          this.form['absolute' + para] = res.data.absolute
          this.form[para] = res.data.relative
          this.$forceUpdate()
          console.log(this.form)
        }
      })
    },
    // handleSuccess(res,para){
    //     console.log(res,para)
    //    this.form[para] = res.data;
    //    this.$forceUpdate()
    // },
    changeTabs() {
      this.$refs[this.activeName].resetFields()
      this.$refs[this.activeName].clearValidate()
      this.getData()
    },
    add(index) {
      this.form.overdueList.splice(index + 1, 0, this.defaultOverdue)
      this.$forceUpdate()
    },
    reduce(index) {
      this.form.overdueList.splice(index, 1)
      //   this.form.overdueList.pop()
    },
    save() {
      this.$refs[this.activeName].validate((valid) => {
        if (valid) {
          paramconfig({
            module: this.activeName,
            kvs: this.form,
          }).then((res) => {
            if (res.success) {
              this.getData()
            }
          })
        }
      })
    },
    getData() {
      findByModule({
        module: this.activeName,
      }).then((res) => {
        if (res.success) {
          if (
            res.data &&
            res.data.module &&
            res.data.kvs &&
            Object.keys(res.data.kvs).length > 0
          ) {
            if (this.activeName == 'login') {
              //图片的绝对地址要重新调接口查
              buildImageUrl({
                ossKeys: [
                  res.data.kvs.webIcon,
                  res.data.kvs.logo,
                  res.data.kvs.backImg,
                ].join(','),
              }).then((res2) => {
                let valuedata = res2.data
                console.log('valuedata', valuedata)
                console.log(valuedata[res.data.kvs.webIcon])
                this.form = {
                  ...res.data.kvs,
                  absolutewebIcon: valuedata[0],
                  absolutelogo: valuedata[1],
                  absolutebackImg: valuedata[2],
                }
                this.$refs[this.activeName].resetFields()
                this.$refs[this.activeName].clearValidate()
              })
            } else {
              this.form = res.data.kvs
              this.$refs[this.activeName].resetFields()
              this.$refs[this.activeName].clearValidate()
            }
          } else {
            if (this.activeName == 'service' && !this.form.overdueList) {
              this.form = {
                isSend: false,
                overdueList: [this.defaultOverdue],
              }
            } else if (this.activeName == 'other') {
              this.form = {
                loginVaildTime: 1440,
                phoneFormat: '^1\d{10}$',
                licenseFormat:
                  '/^(([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](([0-9]{5}[A-Z])|([A-Z]([A-HJ-NP-Z0-9])[0-9]{4})))|([虚无]([A-Z0-9]{6}))|([M]([0-9]{4}))|([M]([A-Z]{1}[0-9]{4}))|([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领])|(WJ[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼0-9A-Z]{1}[0-9]{4}[TDSHBXJ0-9]{1}))$/',
              }
            } else if (this.activeName == 'aiboke') {
              this.form = {
                orderValidTime: 3,
              }
            } else {
              this.form = {}
            }
          }
        }
      })
    },
  },
  created() {
    this.getData()
  },
}
</script>

<style lang="scss" scoped>
.tip {
  color: #ccc;
  position: relative;
  top: -10px;
  font-size: 13px;
  left: 200px;
  margin-bottom: 15px;
}
.minput {
  width: 400px;
}

.sinput {
  width: 100px;
}

.el-row {
  display: flex;
  flex-direction: row;
  /* justify-content: space-between; */
}

.item-buttons {
  display: flex;
  margin-top: -6px;
  // position: absolute;
  // right: 0;
  // bottom: 0;

  .item-button {
    margin-left: 10px;
    font-size: 24px !important;
  }
}
</style>
