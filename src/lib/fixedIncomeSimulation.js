const DAY=86400000

function dateAtNoon(value){return new Date(`${value}T12:00:00`)}
function businessDays(startValue,endValue){const start=dateAtNoon(startValue),end=dateAtNoon(endValue);let total=0;for(let time=+start;time<=+end;time+=DAY){const day=new Date(time).getDay();if(day!==0&&day!==6)total++}return Math.max(total-1,1)}
function incomeTax(days,exempt){if(exempt)return 0;if(days<=180)return 22.5;if(days<=360)return 20;if(days<=720)return 17.5;return 15}

export function simulateFixedIncome({investment,scenarios,products,options}){
 const amount=Number(investment),results=[]
 const scenarioEntries=[['conservative',1],['realistic',2],['optimistic',3]]
 for(const product of products){
  const type=options.titleTypes.find(item=>Number(item.id)===Number(product.titleTypeId));const format=options.formats.find(item=>Number(item.id)===Number(product.formatId));
  const start=dateAtNoon(product.applicationDate),end=dateAtNoon(product.maturityDate),calendarDays=Math.round((end-start)/DAY),workDays=businessDays(product.applicationDate,product.maturityDate),timeCoefficient=workDays/252,tax=incomeTax(calendarDays,Boolean(type?.fg_isento)),rate=Number(product.rate)/100
  for(const[scenarioKey,scenarioId]of scenarioEntries){
   const indexName={1:'ipca',2:'selic',3:'cdi'}[Number(format?.id_indexador)];const indexRate=indexName?Number(scenarios[scenarioKey][indexName])/100:0
   let annualGross=0;if([1,2,4].includes(Number(product.formatId)))annualGross=(1+indexRate)*(1+rate)-1;else if(Number(product.formatId)===3)annualGross=indexRate*rate;else if(Number(product.formatId)===5)annualGross=rate
   const accumulatedNet=(Math.pow(1+annualGross,timeCoefficient)-1)*(1-tax/100)
   results.push({id_cenario:scenarioId,id_titulo:Number(product.id),id_titulo_tipo:Number(product.titleTypeId),nm_titulo_tipo:type?.nm_titulo_tipo||'Título',fg_isento:Boolean(type?.fg_isento),id_indexador_formato:Number(product.formatId),nm_indexador_formato:format?.nm_indexador_formato||'',vr_taxa:Number(product.rate),nm_emissor:product.issuer,dt_aplicacao:product.applicationDate,dt_vencimento:product.maturityDate,pc_aliquota_ir:tax,vr_investir:amount,nr_dias_corridos:calendarDays,nr_dias_uteis:workDays,vr_coef_tempo:Number(timeCoefficient.toFixed(4)),pc_taxa_bruta_anual:Number((annualGross*100).toFixed(4)),pc_taxa_liquida_acumulada:Number((accumulatedNet*100).toFixed(4)),vr_liquido_rendimento:Number((amount*accumulatedNet).toFixed(2)),vr_liquido_acumulado:Number((amount*(1+accumulatedNet)).toFixed(2))})
  }
 }
 return results
}
