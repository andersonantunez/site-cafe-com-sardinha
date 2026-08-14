import { Router } from 'express'
import { query } from '../db.js'

export const rendaFixaRouter = Router()
const fail=(message,status=400)=>Object.assign(new Error(message),{status})
const number=(v,min,max,label)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw fail(`${label} deve estar entre ${min} e ${max}.`);return n}

rendaFixaRouter.get('/opcoes',async(req,res)=>{
 const [types,formats]=await Promise.all([query('SELECT id,nm_titulo_tipo,fg_isento FROM srf.titulo_tipo ORDER BY nm_titulo_tipo'),query('SELECT f.id,f.nm_indexador_formato,f.id_indexador,t.nm_indexador_tipo FROM srf.indexador_formato f JOIN srf.indexador_tipo t ON t.id=f.id_indexador_tipo ORDER BY f.id')])
 res.json({titleTypes:types.rows,formats:formats.rows})
})

rendaFixaRouter.post('/simular',async(req,res)=>{
 const investment=number(req.body.investment,100,1000000000,'Valor investido')
 const scenarios=req.body.scenarios||{};const products=req.body.products
 if(!Array.isArray(products)||!products.length||products.length>20)throw fail('Adicione de 1 a 20 títulos.')
 const keys=['conservative','realistic','optimistic'];const indexKeys={1:'ipca',2:'selic',3:'cdi'}
 const expanded=[]
 products.forEach((p,index)=>{const start=new Date(`${p.applicationDate}T12:00:00`),end=new Date(`${p.maturityDate}T12:00:00`);if(Number.isNaN(+start)||Number.isNaN(+end)||end<=start)throw fail(`Datas incompatíveis no título ${index+1}.`);if((end-start)/86400000>18262)throw fail('O prazo máximo é de 50 anos.');const format=number(p.formatId,1,5,'Formato');const indicator=format===5?null:Number(p.indexerId);const rate=number(p.rate,0,500,'Taxa');if(!String(p.issuer||'').trim()||String(p.issuer).length>80)throw fail('Informe um emissor válido.');keys.forEach((key,scenarioIndex)=>{const idxValue=format===5?0:number(scenarios[key]?.[indexKeys[indicator]],0,100,'Indexador');expanded.push({id_titulo:Number(p.id)||index+1,id_titulo_tipo:number(p.titleTypeId,1,12,'Tipo'),id_indexador_formato:format,id_indexador:indicator,vr_taxa:rate,dt_aplicacao:p.applicationDate,dt_vencimento:p.maturityDate,nm_emissor:String(p.issuer).trim(),id_cenario:scenarioIndex+1,vr_indexador:idxValue,vr_investir:investment})})})
 const {rows}=await query('SELECT * FROM srf.fc_calcula_titulos($1::jsonb)',[JSON.stringify(expanded)])
 res.json({results:rows,scenarioNames:{1:'Conservador',2:'Realista',3:'Otimista'}})
})
