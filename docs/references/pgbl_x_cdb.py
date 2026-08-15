'''Script de referência usado na implementação do simulador web.

O que ele compara

Cenário 1 — investir diretamente em CDB

A pessoa investe R$ 500 por mês.
O CDB rende 110% do CDI.
O CDI utilizado na simulação é fixado em 14,9% ao ano.
O programa calcula o Imposto de Renda devido sobre os rendimentos caso o dinheiro fosse retirado.

Cenário 2 — investir em PGBL

A pessoa coloca os mesmos R$ 500 por mês.
O empregador coloca mais R$ 500, ou seja, uma contrapartida de 100%.
O PGBL rende o equivalente a 100% do CDI.
O programa considera também o benefício fiscal do PGBL.
A economia estimada de Imposto de Renda é posteriormente aplicada em um CDB e também passa a render.
Como ele trata o Imposto de Renda

O programa acompanha cada depósito separadamente. Isso é importante porque um dinheiro investido há 8 anos pode pagar uma alíquota de IR diferente de outro aplicado há apenas alguns meses.

No CDB, o imposto incide somente sobre o rendimento.

No PGBL, o script considera, por padrão, a tabela regressiva, na qual a alíquota diminui conforme o dinheiro permanece mais tempo investido, podendo sair de 35% e chegar a 10%.

Também considera que as contribuições ao PGBL podem gerar benefício fiscal até o limite definido na simulação, atualmente 12% da renda tributável anual.

O que acontece durante a simulação

Todos os meses o programa:

coloca R$ 500 no CDB do primeiro cenário;
coloca R$ 500 do participante + R$ 500 do empregador no PGBL;
aplica os rendimentos;
calcula quanto cada investimento valeria já descontando o IR caso fosse resgatado naquele momento;
calcula a diferença entre os dois cenários.

Em maio de cada ano, ele estima o benefício fiscal referente às contribuições feitas ao PGBL no ano anterior. Esse dinheiro é considerado como reinvestido em um CDB.

O que aparece no resultado

Ao final, o script mostra principalmente:

quanto teria sido investido;
quanto cada alternativa teria acumulado;
quanto seria pago de Imposto de Renda;
quanto sobraria líquido;
quanto do resultado do PGBL veio do benefício fiscal;
qual dos dois cenários terminou com maior patrimônio.

Também gera um gráfico mostrando a evolução do patrimônio dos dois investimentos e arquivos CSV com os cálculos detalhados.

Em uma frase

O script tenta responder: se eu tiver R$ 500 por mês, vale mais a pena colocar diretamente em um CDB de 110% do CDI ou usar um PGBL em que o empregador coloca outros R$ 500, considerando rendimento, Imposto de Renda e benefício fiscal?

Um ponto importante: ele não prevê o futuro. O CDI de 14,9% e as demais taxas são premissas definidas no código e permanecem constantes na simulação.

'''

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Iterable
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
import pandas as pd


# ============================================================
# PARÂMETROS PRINCIPAIS
# ============================================================
# O script trabalha com lotes separados para cada aporte mensal.
# Isso permite calcular corretamente a idade e o IR de cada valor.
#
# Cenário 1:
#   aporte próprio mensal aplicado diretamente em CDB.
#
# Cenário 2:
#   aporte próprio mensal no PGBL + contrapartida do empregador.
#   A economia de IR gerada pelas contribuições próprias ao PGBL
#   é aplicada em uma carteira separada de CDB e passa a render.
#
# A coluna de patrimônio informa quanto sobraria líquido de IR
# se todos os valores fossem resgatados naquele mês.
#
# modo_resgate:
#   "avaliar"  -> não retira o dinheiro; apenas calcula o saldo líquido.
#   "efetivar" -> resgata tudo a cada X meses e reinicia a acumulação.
#                 O valor retirado fica em caixa, sem remuneração.
# ============================================================


@dataclass
class Config:
    data_inicio: date = date(2025, 1, 1)
    meses_simulacao: int = 125
    aporte_mensal: float = 500.00

    # Premissa do CDI anual. Não é uma cotação automática.
    cdi_anual: float = 0.1490

    # Cenário 1: CDB direto
    percentual_cdi_cenario_1: float = 1.10       # 110% do CDI
    tipo_cenario_1: str = "renda_fixa_tributavel"  # ou "isento"
    taxa_adm_anual_cenario_1: float = 0.00
    carregamento_cenario_1: float = 0.00

    # Cenário 2: PGBL
    percentual_cdi_pgbl: float = 1.00            # 100% do CDI
    contrapartida_empregador: float = 1.00       # 100% do aporte próprio
    percentual_vesting_empregador: float = 1.00  # ajuste conforme o contrato
    taxa_adm_anual_pgbl: float = 0.00
    carregamento_pgbl: float = 0.00

    # Benefício fiscal estimado na declaração anual.
    # Premissa: o valor é creditado no início do mês definido abaixo
    # e imediatamente aplicado no mesmo CDB do Cenário 1.
    mes_credito_beneficio_ir: int = 5            # maio
    aliquota_marginal_beneficio_ir: float = 0.275
    limite_deducao_pgbl: float = 0.12
    renda_tributavel_anual_padrao: float = 120_000.00
    renda_tributavel_por_ano: dict[int, float] = field(default_factory=dict)
    aportes_pgbl_anteriores: dict[int, float] = field(default_factory=dict)

    # Tributação do PGBL
    regime_ir_pgbl: str = "regressiva"          # ou "progressiva"
    aliquota_pgbl_progressiva_estimada: float = 0.275

    # Resgates/checkpoints
    resgate_a_cada_meses: int = 24
    modo_resgate: str = "avaliar"               # ou "efetivar"


@dataclass
class Lote:
    data_aporte: date
    principal: float
    saldo: float
    origem: str = "participante"


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================


def somar_meses(data_base: date, meses: int) -> date:
    indice = data_base.month - 1 + meses
    ano = data_base.year + indice // 12
    mes = indice % 12 + 1
    dia = min(data_base.day, monthrange(ano, mes)[1])
    return date(ano, mes, dia)


def ultimo_dia_mes(data_base: date) -> date:
    return date(data_base.year, data_base.month, monthrange(data_base.year, data_base.month)[1])


def taxa_mensal(taxa_anual: float) -> float:
    if taxa_anual <= -1.0:
        raise ValueError("A taxa anual deve ser maior que -100%.")
    return (1.0 + taxa_anual) ** (1.0 / 12.0) - 1.0


def taxa_anual_apos_adm(cdi_anual: float, percentual_cdi: float, taxa_adm_anual: float) -> float:
    # Aproximação simples: rendimento bruto anual menos taxa de administração anual.
    return cdi_anual * percentual_cdi - taxa_adm_anual


def rentabilizar(lotes: Iterable[Lote], taxa_mensal_aplicada: float) -> None:
    for lote in lotes:
        lote.saldo *= 1.0 + taxa_mensal_aplicada


def renda_tributavel(cfg: Config, ano: int) -> float:
    return cfg.renda_tributavel_por_ano.get(ano, cfg.renda_tributavel_anual_padrao)


# ============================================================
# TABELAS DE IMPOSTO DE RENDA
# ============================================================


def aliquota_ir_renda_fixa(dias: int) -> float:
    """IR sobre os rendimentos de renda fixa tributável."""
    if dias <= 180:
        return 0.225
    if dias <= 360:
        return 0.20
    if dias <= 720:
        return 0.175
    return 0.15


def aliquota_ir_pgbl_regressiva(data_aporte: date, data_resgate: date) -> float:
    """IR regressivo do PGBL conforme a idade individual de cada contribuição."""
    if data_resgate <= somar_meses(data_aporte, 24):
        return 0.35
    if data_resgate <= somar_meses(data_aporte, 48):
        return 0.30
    if data_resgate <= somar_meses(data_aporte, 72):
        return 0.25
    if data_resgate <= somar_meses(data_aporte, 96):
        return 0.20
    if data_resgate <= somar_meses(data_aporte, 120):
        return 0.15
    return 0.10


# ============================================================
# RESGATE LOTE A LOTE
# ============================================================


def calcular_resgate_cdb(
    lotes: Iterable[Lote],
    data_resgate: date,
    tipo_investimento: str,
    produto: str,
) -> tuple[dict[str, float], list[dict]]:
    """Calcula o resgate de uma carteira de CDB ou de renda fixa isenta."""
    bruto = 0.0
    ir = 0.0
    detalhes: list[dict] = []

    for lote in sorted(lotes, key=lambda item: item.data_aporte):
        dias = (data_resgate - lote.data_aporte).days
        ganho = max(0.0, lote.saldo - lote.principal)
        aliquota = 0.0 if tipo_investimento == "isento" else aliquota_ir_renda_fixa(dias)
        ir_lote = ganho * aliquota

        bruto += lote.saldo
        ir += ir_lote
        detalhes.append({
            "Produto": produto,
            "Data do aporte": lote.data_aporte,
            "Origem": lote.origem,
            "Dias acumulados": dias,
            "Principal": lote.principal,
            "Saldo bruto": lote.saldo,
            "Base tributável": ganho,
            "Alíquota IR": aliquota,
            "IR": ir_lote,
            "Saldo líquido": lote.saldo - ir_lote,
        })

    return {"bruto": bruto, "ir": ir, "liquido": bruto - ir}, detalhes


def calcular_resgate_pgbl(
    lotes: Iterable[Lote],
    data_resgate: date,
    cfg: Config,
) -> tuple[dict[str, float], list[dict]]:
    bruto_resgatavel = 0.0
    ir = 0.0
    detalhes: list[dict] = []

    for lote in sorted(lotes, key=lambda item: item.data_aporte):
        dias = (data_resgate - lote.data_aporte).days
        fator_vesting = cfg.percentual_vesting_empregador if lote.origem == "empregador" else 1.0
        saldo_resgatavel = lote.saldo * fator_vesting

        if cfg.regime_ir_pgbl == "regressiva":
            aliquota = aliquota_ir_pgbl_regressiva(lote.data_aporte, data_resgate)
        elif cfg.regime_ir_pgbl == "progressiva":
            # Estimativa econômica após o ajuste anual. A retenção na fonte pode diferir.
            aliquota = cfg.aliquota_pgbl_progressiva_estimada
        else:
            raise ValueError("regime_ir_pgbl deve ser 'regressiva' ou 'progressiva'.")

        ir_lote = saldo_resgatavel * aliquota
        bruto_resgatavel += saldo_resgatavel
        ir += ir_lote
        detalhes.append({
            "Produto": "Cenário 2 - PGBL",
            "Data do aporte": lote.data_aporte,
            "Origem": lote.origem,
            "Dias acumulados": dias,
            "Principal": lote.principal,
            "Saldo bruto": lote.saldo,
            "Percentual de vesting": fator_vesting,
            "Saldo bruto resgatável": saldo_resgatavel,
            "Base tributável": saldo_resgatavel,
            "Alíquota IR": aliquota,
            "IR": ir_lote,
            "Saldo líquido": saldo_resgatavel - ir_lote,
        })

    return {"bruto": bruto_resgatavel, "ir": ir, "liquido": bruto_resgatavel - ir}, detalhes


# ============================================================
# SIMULAÇÃO
# ============================================================


def simular(cfg: Config) -> tuple[pd.DataFrame, pd.DataFrame]:
    if cfg.modo_resgate not in {"avaliar", "efetivar"}:
        raise ValueError("modo_resgate deve ser 'avaliar' ou 'efetivar'.")
    if cfg.tipo_cenario_1 not in {"renda_fixa_tributavel", "isento"}:
        raise ValueError("tipo_cenario_1 deve ser 'renda_fixa_tributavel' ou 'isento'.")
    if not 1 <= cfg.mes_credito_beneficio_ir <= 12:
        raise ValueError("mes_credito_beneficio_ir deve estar entre 1 e 12.")

    lotes_c1: list[Lote] = []
    lotes_pgbl: list[Lote] = []
    lotes_cdb_beneficio_ir: list[Lote] = []

    linhas: list[dict] = []
    detalhes_checkpoints: list[dict] = []

    aporte_proprio_pgbl_por_ano = defaultdict(float)
    aporte_proprio_pgbl_por_ano.update(cfg.aportes_pgbl_anteriores)

    beneficio_ir_nominal_acumulado = 0.0
    caixa_resgates_c1 = 0.0
    caixa_resgates_c2 = 0.0

    rendimento_mensal_c1 = taxa_mensal(taxa_anual_apos_adm(
        cfg.cdi_anual,
        cfg.percentual_cdi_cenario_1,
        cfg.taxa_adm_anual_cenario_1,
    ))
    rendimento_mensal_pgbl = taxa_mensal(taxa_anual_apos_adm(
        cfg.cdi_anual,
        cfg.percentual_cdi_pgbl,
        cfg.taxa_adm_anual_pgbl,
    ))

    for indice in range(cfg.meses_simulacao):
        data_aporte = somar_meses(cfg.data_inicio, indice)
        data_avaliacao = ultimo_dia_mes(data_aporte)
        mes_simulacao = indice + 1

        # --------------------------------------------------------
        # 1. Cenário 1: aporte mensal aplicado diretamente no CDB
        # --------------------------------------------------------
        valor_c1 = cfg.aporte_mensal * (1.0 - cfg.carregamento_cenario_1)
        lotes_c1.append(Lote(data_aporte, valor_c1, valor_c1, "participante"))

        # --------------------------------------------------------
        # 2. Cenário 2: aporte próprio + contrapartida no PGBL
        # --------------------------------------------------------
        aporte_proprio = cfg.aporte_mensal
        aporte_empregador = cfg.aporte_mensal * cfg.contrapartida_empregador
        aporte_proprio_pgbl_por_ano[data_aporte.year] += aporte_proprio

        valor_proprio_investido = aporte_proprio * (1.0 - cfg.carregamento_pgbl)
        valor_empregador_investido = aporte_empregador * (1.0 - cfg.carregamento_pgbl)

        lotes_pgbl.append(Lote(
            data_aporte,
            valor_proprio_investido,
            valor_proprio_investido,
            "participante",
        ))
        lotes_pgbl.append(Lote(
            data_aporte,
            valor_empregador_investido,
            valor_empregador_investido,
            "empregador",
        ))

        # --------------------------------------------------------
        # 3. Em maio, calcula a economia de IR do ano anterior
        #    e cria um novo lote de CDB remunerado.
        # --------------------------------------------------------
        contribuicoes_dedutiveis_ano_anterior = 0.0
        beneficio_ir_mes = 0.0

        if data_aporte.month == cfg.mes_credito_beneficio_ir:
            ano_anterior = data_aporte.year - 1
            contribuicoes_ano_anterior = aporte_proprio_pgbl_por_ano[ano_anterior]
            limite_legal = renda_tributavel(cfg, ano_anterior) * cfg.limite_deducao_pgbl
            contribuicoes_dedutiveis_ano_anterior = min(contribuicoes_ano_anterior, limite_legal)
            beneficio_ir_mes = contribuicoes_dedutiveis_ano_anterior * cfg.aliquota_marginal_beneficio_ir

            if beneficio_ir_mes > 0.0:
                beneficio_ir_nominal_acumulado += beneficio_ir_mes
                lotes_cdb_beneficio_ir.append(Lote(
                    data_aporte,
                    beneficio_ir_mes,
                    beneficio_ir_mes,
                    "beneficio_ir_pgbl",
                ))

        # --------------------------------------------------------
        # 4. Rentabilização do mês
        #    O benefício creditado no início do mês também rende.
        # --------------------------------------------------------
        rentabilizar(lotes_c1, rendimento_mensal_c1)
        rentabilizar(lotes_pgbl, rendimento_mensal_pgbl)
        rentabilizar(lotes_cdb_beneficio_ir, rendimento_mensal_c1)

        # --------------------------------------------------------
        # 5. Avaliação líquida caso haja resgate naquele mês
        # --------------------------------------------------------
        resgate_c1, detalhes_c1 = calcular_resgate_cdb(
            lotes_c1,
            data_avaliacao,
            cfg.tipo_cenario_1,
            "Cenário 1 - CDB direto",
        )
        resgate_pgbl, detalhes_pgbl = calcular_resgate_pgbl(
            lotes_pgbl,
            data_avaliacao,
            cfg,
        )
        resgate_cdb_beneficio_ir, detalhes_cdb_beneficio_ir = calcular_resgate_cdb(
            lotes_cdb_beneficio_ir,
            data_avaliacao,
            cfg.tipo_cenario_1,
            "Cenário 2 - CDB da economia de IR",
        )

        checkpoint = cfg.resgate_a_cada_meses > 0 and mes_simulacao % cfg.resgate_a_cada_meses == 0
        resgate_liquido_realizado_c1 = 0.0
        resgate_liquido_realizado_c2 = 0.0

        if checkpoint:
            for detalhe in detalhes_c1 + detalhes_pgbl + detalhes_cdb_beneficio_ir:
                detalhes_checkpoints.append({
                    "Mês da simulação": mes_simulacao,
                    "Data do checkpoint": data_avaliacao,
                    **detalhe,
                })

        if checkpoint and cfg.modo_resgate == "efetivar":
            resgate_liquido_realizado_c1 = resgate_c1["liquido"]
            resgate_liquido_realizado_c2 = (
                resgate_pgbl["liquido"] + resgate_cdb_beneficio_ir["liquido"]
            )

            caixa_resgates_c1 += resgate_liquido_realizado_c1
            caixa_resgates_c2 += resgate_liquido_realizado_c2

            lotes_c1.clear()
            lotes_pgbl.clear()
            lotes_cdb_beneficio_ir.clear()

            patrimonio_c1 = caixa_resgates_c1
            patrimonio_c2 = caixa_resgates_c2
        else:
            patrimonio_c1 = caixa_resgates_c1 + resgate_c1["liquido"]
            patrimonio_c2 = (
                caixa_resgates_c2
                + resgate_pgbl["liquido"]
                + resgate_cdb_beneficio_ir["liquido"]
            )

        linhas.append({
            "Ano": data_aporte.year,
            "Mês": data_aporte.month,
            "Mês da simulação": mes_simulacao,
            "Cenário 1 líquido - CDB direto": patrimonio_c1,
            "Cenário 2 líquido - PGBL + CDB da economia de IR": patrimonio_c2,
            "Diferença C2 - C1": patrimonio_c2 - patrimonio_c1,
            "Benefício IR gerado no mês - Cenário 2": beneficio_ir_mes,
            "Contribuições PGBL dedutíveis do ano anterior": contribuicoes_dedutiveis_ano_anterior,
            "Benefício IR nominal acumulado - Cenário 2": beneficio_ir_nominal_acumulado,
            "Saldo bruto ativo C1 - CDB direto": resgate_c1["bruto"],
            "IR se resgatar C1 - CDB direto": resgate_c1["ir"],
            "Saldo líquido ativo C1 - CDB direto": resgate_c1["liquido"],
            "Saldo bruto resgatável ativo C2 - PGBL": resgate_pgbl["bruto"],
            "IR se resgatar C2 - PGBL": resgate_pgbl["ir"],
            "Saldo líquido ativo C2 - PGBL": resgate_pgbl["liquido"],
            "Saldo bruto ativo C2 - CDB da economia de IR": resgate_cdb_beneficio_ir["bruto"],
            "IR se resgatar C2 - CDB da economia de IR": resgate_cdb_beneficio_ir["ir"],
            "Saldo líquido ativo C2 - CDB da economia de IR": resgate_cdb_beneficio_ir["liquido"],
            "Checkpoint de resgate?": "SIM" if checkpoint else "",
            "Resgate líquido realizado C1": resgate_liquido_realizado_c1,
            "Resgate líquido realizado C2": resgate_liquido_realizado_c2,
        })

    return pd.DataFrame(linhas), pd.DataFrame(detalhes_checkpoints)


# ============================================================
# GRÁFICO
# ============================================================
# ============================================================
# NORMALIZAÇÃO DO DETALHAMENTO
# ============================================================


COLUNAS_DETALHAMENTO = [
    "Mês da simulação",
    "Data do checkpoint",
    "Produto",
    "Data do aporte",
    "Origem",
    "Dias acumulados",
    "Principal",
    "Saldo bruto",
    "Percentual de vesting",
    "Saldo bruto resgatável",
    "Base tributável",
    "Alíquota IR",
    "IR",
    "Saldo líquido",
]


def normalizar_detalhamento(detalhes: pd.DataFrame) -> pd.DataFrame:
    """
    Mantém cabeçalhos válidos mesmo quando não houver nenhum checkpoint.

    Sem essa normalização, pd.DataFrame([]) não possui colunas. Isso pode
    gerar arquivos vazios ou causar erro ao tentar visualizá-los no Colab.
    """
    return detalhes.reindex(columns=COLUNAS_DETALHAMENTO)


# ============================================================
# GRÁFICO
# ============================================================


def formatar_reais_eixo(valor: float, _posicao: int) -> str:
    """Formata os valores do eixo vertical como moeda brasileira sem centavos."""
    return f"R$ {valor:,.0f}".replace(",", ".")


def formatar_reais_rotulo(valor: float) -> str:
    """Formata os rótulos finais do gráfico como moeda brasileira."""
    texto = f"{valor:,.2f}"
    return "R$ " + texto.replace(",", "X").replace(".", ",").replace("X", ".")


def gerar_grafico_comparacao(
    comparacao: pd.DataFrame,
    arquivo_saida: str = "grafico_comparacao_cenarios.png",
) -> None:
    """Gera um gráfico com a evolução mensal líquida dos dois cenários."""
    if comparacao.empty:
        raise ValueError("Não há dados para gerar o gráfico.")

    coluna_cenario_1 = "Cenário 1 líquido - CDB direto"
    coluna_cenario_2 = "Cenário 2 líquido - PGBL + CDB da economia de IR"

    figura, eixo = plt.subplots(figsize=(13, 7))

    linha_c1, = eixo.plot(
        comparacao["Mês da simulação"],
        comparacao[coluna_cenario_1],
        label="Cenário 1 - CDB direto",
        linewidth=2,
    )
    linha_c2, = eixo.plot(
        comparacao["Mês da simulação"],
        comparacao[coluna_cenario_2],
        label="Cenário 2 - PGBL + CDB da economia de IR",
        linewidth=2,
    )

    mes_final = comparacao["Mês da simulação"].iloc[-1]
    valor_final_c1 = comparacao[coluna_cenario_1].iloc[-1]
    valor_final_c2 = comparacao[coluna_cenario_2].iloc[-1]

    # Destaca os pontos finais e escreve o valor acumulado de cada linha.
    eixo.scatter([mes_final], [valor_final_c1], color=linha_c1.get_color(), zorder=4)
    eixo.scatter([mes_final], [valor_final_c2], color=linha_c2.get_color(), zorder=4)

    eixo.annotate(
        formatar_reais_rotulo(valor_final_c1),
        xy=(mes_final, valor_final_c1),
        xytext=(10, -18),
        textcoords="offset points",
        color=linha_c1.get_color(),
        fontsize=10,
        fontweight="bold",
        bbox={"boxstyle": "round,pad=0.25", "facecolor": "white", "alpha": 0.85},
        clip_on=False,
    )
    eixo.annotate(
        formatar_reais_rotulo(valor_final_c2),
        xy=(mes_final, valor_final_c2),
        xytext=(10, 8),
        textcoords="offset points",
        color=linha_c2.get_color(),
        fontsize=10,
        fontweight="bold",
        bbox={"boxstyle": "round,pad=0.25", "facecolor": "white", "alpha": 0.85},
        clip_on=False,
    )

    # Cria espaço à direita para os rótulos finais não serem cortados.
    margem_direita = max(4, int(max(1, mes_final) * 0.10))
    eixo.set_xlim(left=1, right=mes_final + margem_direita)

    eixo.set_title("Evolução do patrimônio líquido ao longo do tempo")
    eixo.set_xlabel("Mês da simulação")
    eixo.set_ylabel("Patrimônio líquido")
    eixo.yaxis.set_major_formatter(FuncFormatter(formatar_reais_eixo))
    eixo.grid(True, alpha=0.3)
    eixo.legend()

    figura.tight_layout()
    figura.savefig(arquivo_saida, dpi=180, bbox_inches="tight")
    plt.close(figura)


# ============================================================
# EXPORTAÇÃO
# ============================================================


def exportar_resultados(comparacao: pd.DataFrame, detalhes: pd.DataFrame) -> None:
    """
    Gera somente os dois arquivos CSV utilizados na análise.

    O separador é vírgula e o separador decimal é ponto para que os arquivos
    sejam interpretados corretamente pelo visualizador do Google Colab.
    """
    # Remove arquivos adicionais gerados por versões anteriores do script.
    arquivos_obsoletos = [
        "comparacao_pgbl_cdb_excel_ptbr.csv",
        "detalhamento_lotes_checkpoints_excel_ptbr.csv",
        "simulacao_pgbl_cdb.xlsx",
    ]
    for arquivo in arquivos_obsoletos:
        Path(arquivo).unlink(missing_ok=True)

    comparacao.to_csv(
        "comparacao_pgbl_cdb.csv",
        index=False,
        decimal=".",
        sep=",",
        encoding="utf-8-sig",
    )
    detalhes.to_csv(
        "detalhamento_lotes_checkpoints.csv",
        index=False,
        decimal=".",
        sep=",",
        encoding="utf-8-sig",
    )


# ============================================================
# EXECUÇÃO
# ============================================================


def main() -> None:
    cfg = Config()
    comparacao, detalhes = simular(cfg)
    detalhes = normalizar_detalhamento(detalhes)

    exportar_resultados(comparacao, detalhes)
    gerar_grafico_comparacao(comparacao)

    colunas_resumo = [
        "Ano",
        "Mês",
        "Mês da simulação",
        "Cenário 1 líquido - CDB direto",
        "Cenário 2 líquido - PGBL + CDB da economia de IR",
        "Benefício IR gerado no mês - Cenário 2",
        "Saldo líquido ativo C2 - CDB da economia de IR",
        "Diferença C2 - C1",
        "Checkpoint de resgate?",
    ]

    print("\nPRIMEIROS MESES\n")
    print(comparacao[colunas_resumo].head(12).round(2).to_string(index=False))

    print("\nCHECKPOINTS DE RESGATE\n")
    checkpoints = comparacao[comparacao["Checkpoint de resgate?"] == "SIM"]
    if checkpoints.empty:
        print("Nenhum checkpoint ocorreu no período simulado.")
    else:
        print(checkpoints[colunas_resumo].round(2).to_string(index=False))

    print("\nRESULTADO FINAL\n")
    print(comparacao[colunas_resumo].tail(1).round(2).to_string(index=False))

    print("\nArquivos gerados:")
    print("- comparacao_pgbl_cdb.csv")
    print("- detalhamento_lotes_checkpoints.csv")
    print("- grafico_comparacao_cenarios.png")


if __name__ == "__main__":
    main()


