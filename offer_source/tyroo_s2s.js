
function getGeo(val){
    try{
        return val.include.geo;
    }catch(e){
        return false;
    }
}

function getCap(val) {
    if (val.Install) {
        return val.Install;
    }
    return 0;
}

//test();
//
const rp = require('request-promise-native');
const nlog = require('../model/nlog');
const fun = require('../model/functions');
exports.getOffer = function(){
    return new Promise(async function(ac,rj){  //resolve, reject  async表示函数里有异步操作
        try{
            console.log('tyroo_s2s');
            let maxpage = 1;
            let offers=[];
            let p_offers=[];
            for(let j=1;j <= maxpage;j++){
                p_offers.push(getPage(j)) ;
            }
            //里面有多个await Promise.all写法让其同时触发 节约时间
            let new_offers = await Promise.all(p_offers); //await 表示紧跟在后面的表达式需要等待结果 await命令后面，可以是 Promise 对象和原始类型的值（数值、字符串和布尔值，但这时等同于同步操作
            for(let k in new_offers){
                offers.push.apply(offers, new_offers[k]); //合并
            }
            ac(offers);
        }catch (e) {
            rj(e);
        }

    });
}

function getPage(page) {
    return new Promise(async (ac, rj) => {
        let offers = [];
    try {

        let op = {
            method: 'GET',
            url: 'http://video.tyroo.com/image?requestParams={"affId":"24569","placementId":"1933","packageName":"","subid1":"","subid2":"","subid3":"","subid4":"","subid5":"","requestSource":"PUBLIC"}',
            headers: {
                'User-Agent': 'request'
            }
        }
        let data = await rp(op);
        data = JSON.parse(data);

        if (data.data.offers.length == 0) {
            return ac([]);
        }

        let offer_ids = await rp('http://portal.leanmobi.com/?s=admin/auto_pull/getOfferIdsByAdvName&adv=tyroo_s2s');
        offer_ids = JSON.parse(offer_ids);

        let offer_id_arr = [];
        if (offer_ids.offer_id.length > 0) {
            offer_ids = offer_ids.offer_id.split(',');
            for (let i in offer_ids)  {
                offer_id_arr.push(String(offer_ids[i]));
            }
        }

        for (let i in data.data.offers) {

            let tmpOffer = {};
            let adv_offer = data.data.offers[i];
            //console.log(adv_offer);return ;
            if (adv_offer.creatives == null) {
                continue;
            }

            if (offer_id_arr.length > 0) {
                if (offer_id_arr.indexOf(adv_offer.advertiser.campaignId) == -1) {
                    continue;
                }
            }

            tmpOffer.payout = adv_offer.pricing.pricing+'';

            let geo = getGeo(adv_offer.targeting);

            if ((!geo) || (tmpOffer.payout < 0.08)) {
                continue;
            }

            tmpOffer.geo = geo;

            tmpOffer.adv_offer_id = adv_offer.advertiser.campaignId+'';
            tmpOffer.package_name = fun.getPackageName(adv_offer.advertiser.storeURL);
            if (!tmpOffer.package_name) {
                continue;
            }

            tmpOffer.offer_name = adv_offer.advertiser.campaignName;
            tmpOffer.daily_cap = getCap(adv_offer.capping);

            if (tmpOffer.package_name.indexOf(".") > 0) {
                tmpOffer.platform = 'android';
            } else {
                tmpOffer.platform = 'ios';
                tmpOffer.package_name = tmpOffer.package_name.replace('id', '');
            }
            let clickUrl = dealTracking(adv_offer.creatives);

            tmpOffer.adv_url = clickUrl.replace('subId1','subid1={clickid}').replace('subId2', 'subid2={network_id}_{sub_id}').replace('gaid=', 'gaid={gaid}').replace('IDFA=', 'IDFA={idfa}');

            tmpOffer.kpi = adv_offer.advertiser.KPI;

            tmpOffer.survey_level = 1;
            tmpOffer.manually = 1;//停用探测,非空都不探测
            tmpOffer.survey_status = true;

            tmpOffer.strict_geo = 1;

            offers.push(tmpOffer);
        }
        ac(offers);
    } catch (e) {

        rj(e);
    }
});

}

function dealTracking(Urlpamars)
{
    try{
        for (let i in Urlpamars) {
            return Urlpamars[i].clickURL;
        }

    }catch (e){
        return e;
    }
}