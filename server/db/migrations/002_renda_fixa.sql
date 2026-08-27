CREATE SCHEMA IF NOT EXISTS srf;

CREATE TABLE IF NOT EXISTS srf.indexador (id integer PRIMARY KEY, nm_indexador varchar NOT NULL);
CREATE TABLE IF NOT EXISTS srf.indexador_tipo (id integer PRIMARY KEY, nm_indexador_tipo varchar NOT NULL);
CREATE TABLE IF NOT EXISTS srf.indexador_formato (
  id integer PRIMARY KEY,
  nm_indexador_formato varchar NOT NULL,
  id_indexador_tipo integer NOT NULL REFERENCES srf.indexador_tipo(id),
  id_indexador integer REFERENCES srf.indexador(id)
);
CREATE TABLE IF NOT EXISTS srf.titulo_tipo (id integer PRIMARY KEY, nm_titulo_tipo varchar NOT NULL, fg_isento boolean NOT NULL);
CREATE TABLE IF NOT EXISTS srf.ir_rf (id integer PRIMARY KEY, nr_dias_ini integer NOT NULL, nr_dias_fim integer, vr_aliquota numeric NOT NULL);
CREATE TABLE IF NOT EXISTS srf.feriado (dt_feriado date PRIMARY KEY, nm_feriado text NOT NULL);

INSERT INTO srf.indexador VALUES (1,'IPCA'),(2,'SELIC'),(3,'CDI'),(4,'IGP-M'),(5,'TR') ON CONFLICT (id) DO UPDATE SET nm_indexador=excluded.nm_indexador;
INSERT INTO srf.indexador_tipo VALUES (1,'INFLAÇÃO'),(2,'PÓS-FIXADO'),(3,'PRÉ-FIXADO') ON CONFLICT (id) DO UPDATE SET nm_indexador_tipo=excluded.nm_indexador_tipo;
INSERT INTO srf.indexador_formato VALUES (1,'IPCA+',1,1),(2,'SELIC+',2,2),(3,'% do CDI',2,3),(4,'CDI+',2,3),(5,'PRÉ',3,NULL) ON CONFLICT (id) DO UPDATE SET nm_indexador_formato=excluded.nm_indexador_formato,id_indexador_tipo=excluded.id_indexador_tipo,id_indexador=excluded.id_indexador;
INSERT INTO srf.titulo_tipo VALUES (1,'LCD',true),(2,'LCI',true),(3,'LCA',true),(4,'DEBÊNTURE INCENTIVADA',true),(5,'DEBÊNTURE',false),(6,'CDB',false),(7,'CRI',false),(8,'CRA',false),(9,'FIDC',false),(10,'LF',false),(11,'LC',false),(12,'TESOURO DIRETO',false) ON CONFLICT (id) DO UPDATE SET nm_titulo_tipo=excluded.nm_titulo_tipo,fg_isento=excluded.fg_isento;
INSERT INTO srf.ir_rf VALUES (1,0,180,22.5),(2,181,360,20),(3,361,720,17.5),(4,721,NULL,15) ON CONFLICT (id) DO UPDATE SET nr_dias_ini=excluded.nr_dias_ini,nr_dias_fim=excluded.nr_dias_fim,vr_aliquota=excluded.vr_aliquota;

CREATE OR REPLACE FUNCTION srf.fc_obtem_dias_uteis(p_dt_inicio date,p_dt_fim date)
RETURNS TABLE(nr_dia bigint,nr_dia_mes bigint,dt_referencia date) LANGUAGE sql AS $$
 SELECT row_number() OVER (),row_number() OVER (PARTITION BY date_trunc('month',d)),d::date
 FROM generate_series(p_dt_inicio,p_dt_fim,'1 day') d WHERE extract(dow FROM d) NOT IN (0,6) AND NOT EXISTS(SELECT 1 FROM srf.feriado f WHERE f.dt_feriado=d::date)
$$;

CREATE OR REPLACE FUNCTION srf.fc_obtem_aliquota_ir_rf(p_id_titulo_tipo integer,p_dt_inicio date,p_dt_fim date)
RETURNS numeric LANGUAGE sql AS $$
 SELECT CASE WHEN t.fg_isento THEN 0 ELSE (SELECT i.vr_aliquota FROM srf.ir_rf i WHERE (p_dt_fim-p_dt_inicio)>=i.nr_dias_ini AND (i.nr_dias_fim IS NULL OR (p_dt_fim-p_dt_inicio)<=i.nr_dias_fim)) END FROM srf.titulo_tipo t WHERE t.id=p_id_titulo_tipo
$$;

CREATE OR REPLACE FUNCTION srf.fc_calcula_titulo(p_dt_inicio date,p_dt_fim date,p_pc_aliquota_ir numeric,p_id_indexador_formato integer,p_vr_indexador numeric,p_vr_taxa numeric)
RETURNS TABLE(nr_dias_corridos integer,nr_dias_uteis integer,vr_coef_tempo numeric,vr_taxa_bruta_anual numeric,vr_aliquota_ir numeric,vr_taxa_liquida_acumulada numeric,vr_taxa_liquida_diaria numeric) LANGUAGE sql AS $$
 WITH base AS (SELECT (p_dt_fim-p_dt_inicio)::int dc, greatest((SELECT count(*)-1 FROM srf.fc_obtem_dias_uteis(p_dt_inicio,p_dt_fim)),1)::int du,p_pc_aliquota_ir/100.0 ir), calc AS (SELECT *,du/252.0 coef,CASE WHEN p_id_indexador_formato IN(1,2,4) THEN (1+p_vr_indexador/100.0)*(1+p_vr_taxa/100.0)-1 WHEN p_id_indexador_formato=3 THEN p_vr_indexador/100.0*p_vr_taxa/100.0 WHEN p_id_indexador_formato=5 THEN p_vr_taxa/100.0 END bruto FROM base)
 SELECT dc,du,coef,bruto,ir,(power(1+bruto,coef)-1)*(1-ir),power(1+(power(1+bruto,coef)-1)*(1-ir),1.0/du)-1 FROM calc
$$;

CREATE OR REPLACE FUNCTION srf.fc_calcula_titulos(p_json jsonb)
RETURNS TABLE(id_cenario integer,id_indexador integer,nm_indexador text,vr_indexador numeric,id_titulo integer,id_titulo_tipo integer,fg_isento boolean,nm_titulo_tipo varchar,id_indexador_formato integer,nm_indexador_formato text,id_indexador_tipo integer,nm_indexador_tipo text,vr_taxa numeric,nm_emissor text,dt_aplicacao date,dt_vencimento date,pc_aliquota_ir numeric,vr_investir numeric,nr_dias_corridos numeric,nr_dias_uteis numeric,vr_coef_tempo numeric,pc_taxa_bruta_anual numeric,pc_taxa_liquida_acumulada numeric,pc_taxa_liquida_diaria numeric,vr_liquido_rendimento numeric,vr_liquido_acumulado numeric) LANGUAGE sql AS $$
 WITH tit AS (SELECT x.*,srf.fc_obtem_aliquota_ir_rf(x.id_titulo_tipo,x.dt_aplicacao,x.dt_vencimento) ir FROM jsonb_to_recordset(p_json) x(id_titulo integer,id_titulo_tipo integer,id_indexador_formato integer,id_indexador integer,vr_taxa numeric,dt_aplicacao date,dt_vencimento date,nm_emissor text,id_cenario integer,vr_indexador numeric,vr_investir numeric))
 SELECT tit.id_cenario,tit.id_indexador,i.nm_indexador::text,tit.vr_indexador,tit.id_titulo,tit.id_titulo_tipo,tt.fg_isento,tt.nm_titulo_tipo,tit.id_indexador_formato,f.nm_indexador_formato::text,f.id_indexador_tipo,it.nm_indexador_tipo::text,tit.vr_taxa,tit.nm_emissor,tit.dt_aplicacao,tit.dt_vencimento,tit.ir,tit.vr_investir,c.nr_dias_corridos,c.nr_dias_uteis,round(c.vr_coef_tempo,4),round(c.vr_taxa_bruta_anual*100,4),round(c.vr_taxa_liquida_acumulada*100,4),round(c.vr_taxa_liquida_diaria*100,8),round(tit.vr_investir*c.vr_taxa_liquida_acumulada,2),round(tit.vr_investir*(1+c.vr_taxa_liquida_acumulada),2)
 FROM tit JOIN srf.titulo_tipo tt ON tt.id=tit.id_titulo_tipo JOIN srf.indexador_formato f ON f.id=tit.id_indexador_formato JOIN srf.indexador_tipo it ON it.id=f.id_indexador_tipo LEFT JOIN srf.indexador i ON i.id=f.id_indexador LEFT JOIN LATERAL srf.fc_calcula_titulo(tit.dt_aplicacao,tit.dt_vencimento,tit.ir,tit.id_indexador_formato,tit.vr_indexador,tit.vr_taxa)c ON true
$$;
