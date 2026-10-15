'use strict';
const {requestJson}=require('./shopier-client');
function configuration(env,now) {
    const until=Number(env.EMAIL_SMOKE_TEST_UNTIL);
    if(!env.EMAIL_SMOKE_TEST_TO || !Number.isSafeInteger(until) || until<=now || until>now+3600000 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EMAIL_SMOKE_TEST_TO) ||
        !/^[a-zA-Z0-9_-]{8,100}$/.test(env.EMAIL_SMOKE_TEST_ID||'') || !env.RESEND_API_KEY)return null;
    return {headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json',
        'Idempotency-Key':env.EMAIL_SMOKE_TEST_ID},to:env.EMAIL_SMOKE_TEST_TO};
}
async function runEmailSmokeTest({env=process.env,transport=requestJson,now=Date.now()}={}) {
    const config=configuration(env,now);if(!config)return {status:'disabled'};
    const body=JSON.stringify({from:env.RESEND_FROM_EMAIL||'Bar Cepte <lisans@barcepte.com.tr>',to:[config.to],
        subject:'Bar Cepte — E-posta teslimat testi',
        text:'Bar Cepte e-posta servisi test mesajıdır. Bu işlem ödeme almaz ve üyelik oluşturmaz.'});
    const result=await transport('https://api.resend.com/emails',config.headers,'POST',body);
    if(!/^[a-zA-Z0-9-]{10,100}$/.test(result.id||''))throw new Error('Missing delivery receipt');
    return {status:'accepted',id:result.id};
}
async function getEmailSmokeStatus(id,{env=process.env,transport=requestJson}={}) {
    if(!/^[a-zA-Z0-9-]{10,100}$/.test(id))throw new Error('Invalid delivery receipt');
    const result=await transport('https://api.resend.com/emails/'+id,{Authorization:'Bearer '+env.RESEND_API_KEY});
    return ['sent','delivered','delivery_delayed','bounced','complained','failed','queued','scheduled'].includes(result.last_event)?result.last_event:'unknown';
}
module.exports={runEmailSmokeTest,getEmailSmokeStatus};
