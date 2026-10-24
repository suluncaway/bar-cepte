/* Shared, read-only previews for the business forms. */
(function(root){
 'use strict';
 const rules=typeof module!=='undefined'&&module.exports?require('./business-rules'):root.BarBusiness;
 function preview(state,kind,data){
  const plan=rules.movementPlan(state,kind,data);if(!plan)return null;
  const lines=plan.lines.map(line=>{const product=state.products.find(row=>row.id===line.productId);const after=Math.round((product.stock+line.delta)*1000)/1000;
   return {...line,name:product.name,unit:product.unit,before:product.stock,after,blocked:after<0||after>1e9};});
  return {...plan,lines,blocked:lines.some(line=>line.blocked)};
 }
 function restockPacks(product){return Math.max(1,Math.floor((product.minimum-product.stock)/product.packSize)+1);}
 const api={preview,restockPacks};root.BarBusinessFlow=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
