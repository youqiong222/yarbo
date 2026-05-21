const TEST_HOST = 'https://6eki2htjre.execute-api.us-east-1.amazonaws.com/Stage';
const PRODUCTION_HOST = 'https://4zx17x5q7l.execute-api.us-east-1.amazonaws.com/Stage';
const ORIGIN_HOST = PRODUCTION_HOST;
function createCaptchaService(config = {}) {
  const {
    sendCodeEndpoint = ORIGIN_HOST + '/yarbo/message-service/msg/mail/captcha',
    resetPasswordEndpoint = ORIGIN_HOST + '/yarbo/robot-service/robot/commonUser/resetPw',
    requestType = 1,
    sendBtn = '',
    tipEle = '',
    headers = {
      'Content-Type': 'application/json',
    },
  } = config;

  const REGEX = {
    email:
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    pwd: /^\S*(?=\S{8,22})(?=\S*\d)(?=\S*[A-Z])(?=\S*[a-z])(?=\S*[`~!@#$%^&*()_+=|\\;:(){}'',\[\].<>/?~@#￥%……&*（）——+|{}【】‘；：”“’。，、？-])\S*$/,
  };

  const validate = (value, type) => {
    return REGEX[type].test(value);
  };

  let isLocked = false;
  let countdown = 0;
  let timer = null;

  const updateCountdown = () => {
    countdown--;
    sendBtn.querySelector('.display-text').textContent = `Send Code (${countdown}s)`;
    tipEle.textContent = `Resend verification code (${countdown}s)`;

    if (countdown <= 0) {
      clearInterval(timer);
      sendBtn.classList.remove('ant-btn-loading');
      sendBtn.querySelector('.display-text').textContent = 'Send Code';
      tipEle.textContent = `Resend verification code`;
      sendBtn.querySelector('.ant-btn-icon').classList.add('hidden');
      isLocked = false;
    }
  };

  const startCountdown = (seconds = 60) => {
    isLocked = true;
    countdown = seconds;

    sendBtn.classList.add('ant-btn-loading');
    sendBtn.querySelector('.display-text').textContent = `Send Code (${seconds})`;
    sendBtn.querySelector('.ant-btn-icon').classList.remove('hidden');
    tipEle.textContent = `Resend verification code (${seconds}s)`;

    timer = setInterval(updateCountdown, 1000);
  };

  const sendRequest = (email) => {
    console.log('isLocked', isLocked);
    if (isLocked) return Promise.reject(new Error('Request is locked'));

    return fetch(sendCodeEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: requestType,
        target: email,
      }),
    })
      .then((response) => {
        console.log(response, 'response');
        // 先检查 HTTP 状态码
        if (!response.ok) {
          throw new Error(response.message || `HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log(data, 'parsed data');
        // 再检查业务逻辑的 success 字段
        if (!data.success) {
          throw new Error(data.message || `Request failed`);
        }

        // 只有成功时才启动倒计时
        startCountdown(60);
        return data;
      });
  };

  const resetPassword = (body) => {
    return fetch(resetPasswordEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        resetData: body,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.success) {
          throw new Error(data.message || 'Reset password failed');
        }
        return data;
      });
  };

  return {
    sendCaptcha: (email) => {
      // 返回 Promise，让调用方处理异步结果
      return sendRequest(email);
    },
    resetPassword: (body) => {
      // 返回 Promise，让调用方处理异步结果
      return resetPassword(body);
    },
    validate: (value, type) => {
      return validate(value, type);
    },
  };
}
