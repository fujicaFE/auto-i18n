/* 通用接口 */
import request from '@/utils/request'

/* 获取省市区级联树 */
export function getRegionTree(params) {
  return request({
    url: '/sys/region/tree',
    method: 'GET',
    params,
  })
}

/* 获取字典列表通过字典类型Code */
export function getDictByTypeCode(typeCode) {
  return request({
    url: `/sys/dictdetail/valid/${typeCode}`,
    method: 'GET',
  })
}

export function getIntDictByTypeCode(typeCode) {
  return request({
    url: `/sys/dictdetail/valid/int/${typeCode}`,
    method: 'GET',
  })
}

export function downloadStatic(code) {
  return request({
    url: `/sys/resource/static/` + code,
    method: 'GET',
  })
}
