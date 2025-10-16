/**
 * 通用工具函数
 */

// 日期格式化函数
export function formatDate(date) {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('zh-CN', options);
}

// 验证工具
export const validators = {
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) ? null : $t('邮箱格式不正确');
  },

  phone: (phone) => {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(phone) ? null : $t('手机号格式不正确');
  },

  required: (value) => {
    return value && value.toString().trim() ? null : $t('此字段为必填项');
  },

  minLength: (min) => (value) => {
    return value && value.length >= min ? null : `至少需要${min}个字符`;
  },

  maxLength: (max) => (value) => {
    return value && value.length <= max ? null : `最多允许${max}个字符`;
  }
};

// 消息提示工具
export const message = {
  success: (msg) => {
    console.log($t('成功:'), msg);
    alert(`成功: ${msg}`);
  },

  error: (msg) => {
    console.error($t('错误:'), msg);
    alert(`错误: ${msg}`);
  },

  warning: (msg) => {
    console.warn($t('警告:'), msg);
    alert(`警告: ${msg}`);
  },

  info: (msg) => {
    console.info($t('信息:'), msg);
    alert(`信息: ${msg}`);
  }
};

// 数据处理工具
export const dataUtils = {
  // 深拷贝
  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => dataUtils.deepClone(item));

    const cloned = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = dataUtils.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  // 去重
  unique: (array, key = null) => {
    if (!key) {
      return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter((item) => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  },

  // 分组
  groupBy: (array, key) => {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  // 排序
  sortBy: (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
};

// 本地存储工具
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log($t('数据已保存到本地存储'));
    } catch (error) {
      console.error($t('保存到本地存储失败:'), error);
      message.error($t('保存数据失败'));
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error($t('从本地存储读取数据失败:'), error);
      message.error($t('读取数据失败'));
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      console.log($t('数据已从本地存储移除'));
    } catch (error) {
      console.error($t('从本地存储移除数据失败:'), error);
      message.error($t('删除数据失败'));
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      console.log($t('本地存储已清空'));
      message.success($t('本地存储已清空'));
    } catch (error) {
      console.error($t('清空本地存储失败:'), error);
      message.error($t('清空存储失败'));
    }
  }
};

// 网络请求工具
export const http = {
  get: async (url, params = {}) => {
    try {
      console.log($t('发起GET请求:'), url);
      // 模拟网络请求
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true, data: $t('模拟数据'), message: $t('请求成功') };
    } catch (error) {
      console.error($t('GET请求失败:'), error);
      throw new Error($t('网络请求失败'));
    }
  },

  post: async (url, data = {}) => {
    try {
      console.log($t('发起POST请求:'), url, data);
      // 模拟网络请求
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return { success: true, data: data, message: $t('提交成功') };
    } catch (error) {
      console.error($t('POST请求失败:'), error);
      throw new Error($t('提交数据失败'));
    }
  }
};

// 常用常量
export const constants = {
  STATUS: {
    PENDING: $t('待处理'),
    PROCESSING: $t('处理中'),
    COMPLETED: $t('已完成'),
    FAILED: $t('失败'),
    CANCELLED: $t('已取消')
  },

  USER_ROLES: {
    ADMIN: $t('管理员'),
    USER: $t('普通用户'),
    GUEST: $t('访客')
  },

  MESSAGES: {
    SAVE_SUCCESS: $t('保存成功'),
    DELETE_SUCCESS: $t('删除成功'),
    UPDATE_SUCCESS: $t('更新成功'),
    OPERATION_FAILED: $t('操作失败'),
    NO_DATA: $t('暂无数据'),
    LOADING: $t('加载中...'),
    CONFIRM_DELETE: $t('确认删除这条记录吗？'),
    CONFIRM_LOGOUT: $t('确认要退出登录吗？')
  }
};