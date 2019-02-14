
const rp = require('request-promise-native');
const nlog = require('../model/nlog');
const fun = require('../model/functions');

exports.getOffer = function(){
    return new Promise(async function(ac,rj){  //resolve, reject  async表示函数里有异步操作
        try{
            console.log('mobgeek');
            let maxpage = 1;
            let offers=[];
            let p_offers=[];
            for(let j=1;j <= maxpage;j++){
                p_offers.push(getPage(j)) ;
            }
            //里面有多个await Promise.all写法让其同时触发 节约时间
            let new_offers = await Promise.all(p_offers);
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
            let data = await rp('http://offers.admobgeek.com/adOffer/offer/list?affiliateId=10717&key=a76603f6cfcd7b57de290b90ed086f6e');
            //console.log(data);
            data = JSON.parse(data);

            if (data.offers.length == 0) {
                return ac([]);
            }

            for (let i in data.offers) {

                let tmpOffer = {};
                let adv_offer = data.offers[i];
                //console.log(adv_offer);return;
                if (adv_offer.trackLink == null) {
                    continue;
                }

                tmpOffer.payout = adv_offer.payout;

                let geo = adv_offer.countries;

                if ((!geo) || (tmpOffer.payout < 0.08)) {
                    continue;
                }
                tmpOffer.geo = geo.split(',');

                tmpOffer.adv_offer_id = adv_offer.offerId+'';
                tmpOffer.package_name = fun.getPackageName(adv_offer.previewLink);
                if (!tmpOffer.package_name) {
                    continue;
                }

                tmpOffer.offer_name = adv_offer.offerName;
                tmpOffer.daily_cap = adv_offer.capDaily;
                if (tmpOffer.package_name.indexOf(".") > 0) {
                    tmpOffer.platform = 'android';
                } else {
                    tmpOffer.platform = 'ios';
                    tmpOffer.package_name = tmpOffer.package_name.replace('id', '');
                }
                let platform = dealTracking(tmpOffer.platform);

                tmpOffer.adv_url = adv_offer.trackLink + '&aff_click_id={clickid}&sub_affid={network_id}_{sub_id}&device_id='+platform;

                tmpOffer.kpi = adv_offer.kpi;

                offers.push(tmpOffer);
            }
            ac(offers);
        } catch (e) {

            rj(e);
        }
    });
}

function dealTracking(platform)
{
    try{
        if (platform == 'ios') {
            return '{idfa}';
        } else {
            return '{gaid}';
        }

    }catch (e){
        return e;
    }
}

