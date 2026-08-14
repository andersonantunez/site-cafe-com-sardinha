'''
Esse script tenta responder a uma pergunta simples:

É melhor comprar um produto à vista com 10% de desconto ou parcelar em 12 vezes e deixar o dinheiro investido?

No exemplo, o produto custa R$ 5.121,11. À vista, com 10% de desconto, custaria aproximadamente R$ 4.609,00. Parcelado, seriam 12 parcelas de cerca de R$ 426,76.

Cenário 1 — comprar à vista

A pessoa paga o produto à vista e aproveita o desconto de aproximadamente R$ 512,11.

Depois, o programa considera que ela passa a investir mensalmente o valor que corresponderia às parcelas. No primeiro mês, investe:

os R$ 512,11 economizados no desconto;
mais uma parcela de aproximadamente R$ 426,76.

Nos meses seguintes, investe aproximadamente R$ 426,76 por mês.

Esse dinheiro rende como uma aplicação de 110% do CDI.

Cenário 2 — comprar parcelado

Nesse cenário, a pessoa mantém inicialmente os R$ 5.121,11 investidos e compra o produto em 12 parcelas.

O dinheiro também rende o equivalente a 110% do CDI durante os 12 meses.

A intenção é verificar se os juros obtidos deixando o dinheiro aplicado compensam ou não o desconto de 10% oferecido para pagamento à vista.

Imposto de Renda

Nos dois cenários, o programa considera uma alíquota de 20% de Imposto de Renda sobre o rendimento da aplicação ao final do período.

Ou seja, ele não desconta 20% de todo o dinheiro, apenas do ganho obtido com os investimentos.

Resultado apresentado

Ao longo dos 12 meses, o programa mostra:

quanto foi investido;
quanto rendeu naquele mês;
quanto existe acumulado em cada cenário;
e, ao final, qual alternativa terminou com maior valor líquido.

Também gera um gráfico mostrando a evolução dos dois cenários.

Em uma frase

O programa compara o benefício de receber 10% de desconto pagando à vista com o benefício de manter o dinheiro investido e pagar o produto em 12 parcelas.

Há um detalhe importante no código

Do jeito que ele está escrito, existe uma inconsistência no cenário parcelado: o programa mostra o pagamento mensal das parcelas, mas não desconta essas parcelas do saldo investido.

Ou seja, esta linha calcula os juros:

saldo_cenario_2 += juros_mes_2

mas não existe algo como:

saldo_cenario_2 -= pagamento_fixo

Portanto, o gráfico pode transmitir uma comparação diferente daquela que intuitivamente se espera.

Além disso, no cálculo final do cenário parcelado, o código considera como aporte um valor que não corresponde exatamente ao dinheiro que foi efetivamente colocado nesse investimento.

Então, a ideia do script é comparar à vista versus parcelado com o dinheiro rendendo, mas o cálculo do cenário parcelado merece ser corrigido antes de usar o resultado como conclusão financeira.

'''

import matplotlib.pyplot as plt

# Parâmetros
valor_produto = 5121.11 #5121.11
desconto_avista = 0.10
numero_parcelas = 12 # 12
valor_avista = valor_produto * (1 - desconto_avista)
valor_sobrando = valor_produto - valor_avista
parcela_mensal = valor_produto / numero_parcelas

# CDI e rendimentos
cdi_aa = 0.1490
cdi_mensal = (1 + cdi_aa) ** (1 / numero_parcelas) - 1

################################ Cenario 1
taxa_invest_cenario_1 = 110
nome_cenario_1 = "à vista"
invesimento_cenario_1 = cdi_mensal * (taxa_invest_cenario_1 / 100)
aliquota_ir_cenario_1 = 0.20

################################ Cenario 2
taxa_invest_cenario_2 = 110
nome_cenario_2 = "parcelado"
invesimento_cenario_2 = cdi_mensal * (taxa_invest_cenario_2 / 100)
aliquota_ir_cenario_2 = 0.20

# Inicializações
saldo_cenario_1 = 0
saldo_cenario_2 = valor_produto
pagamento_fixo = parcela_mensal

# Impressão linha a linha + dados para gráfico
linhas = []
meses = []
saldos_1 = []
saldos_2 = []

linhas.append("Comparativo mês a mês com Aporte (inclui desconto), Juros e Pagamento\n")
linhas.append("{:<6} {:>10} {:>20} {:>18} {:>12} {:>20} {:>18}".format(
    "Mês", "Aporte (C1)", "Juros (C1)", "Saldo (C1)", "Pagto (C2)", "Juros (C2)", "Saldo (C2)"))

for mes in range(1, numero_parcelas+1):
    if mes == 1:
        aporte = valor_sobrando + parcela_mensal  # R$ 900 + R$ 750
    else:
        aporte = parcela_mensal

    # Cenário 1
    saldo_cenario_1 += aporte
    juros_mes_1 = saldo_cenario_1 * invesimento_cenario_1
    saldo_cenario_1 += juros_mes_1

    # Cenário 2
    juros_mes_2 = saldo_cenario_2 * invesimento_cenario_2
    saldo_cenario_2 += juros_mes_2

    # Guardar para tabela e gráfico
    linhas.append("{:<6} {:>10,.2f} {:>20,.2f} {:>18,.2f} {:>12,.2f} {:>20,.2f} {:>18,.2f}".format(
        mes, aporte, juros_mes_1, saldo_cenario_1, pagamento_fixo, juros_mes_2, saldo_cenario_2))

    meses.append(f"Mês {mes}")
    saldos_1.append(saldo_cenario_1)
    saldos_2.append(saldo_cenario_2)

# Aplicar IR no final do Cenário 1
aporte_total_1 = valor_sobrando + parcela_mensal * numero_parcelas
ganho_bruto_1 = saldo_cenario_1 - aporte_total_1
ganho_liquido_1 = ganho_bruto_1 * (1 - aliquota_ir_cenario_1)
saldo_cenario_1_liquido = aporte_total_1 + ganho_liquido_1
saldos_1[-1] = saldo_cenario_1_liquido

# Aplicar IR no final do Cenário 2 (isento, mas estrutura mantida)
aporte_total_2 = valor_sobrando + parcela_mensal * numero_parcelas
ganho_bruto_2 = saldo_cenario_2 - aporte_total_2
ganho_liquido_2 = ganho_bruto_2 * (1 - aliquota_ir_cenario_2)
saldo_cenario_2_liquido = aporte_total_2 + ganho_liquido_2
saldos_2[-1] = saldo_cenario_2_liquido

# Resumo final
linhas.append(f"\nResumo Final após {numero_parcelas} meses:")
linhas.append(f"Cenário 1 ({nome_cenario_1}): R$ {saldo_cenario_1_liquido:,.2f}")
linhas.append(f"Cenário 2 ({nome_cenario_2}): R$ {saldo_cenario_2_liquido:,.2f}")

# Exibir linhas
print("\n".join(linhas))
print()
print()

# Gráfico
offset = 200  # deslocamento vertical em reais (ajuste conforme o gráfico)

plt.figure(figsize=(10, 6))
plt.plot(meses, saldos_1, marker='o', label=f'Cenário 1 ({nome_cenario_1})')
plt.plot(meses, saldos_2, marker='o', label=f'Cenário 2 ({nome_cenario_2})')

ultima_parcela = numero_parcelas - 1

# Adiciona os textos com deslocamento
plt.text(meses[ultima_parcela], saldos_1[ultima_parcela] + offset, f"{saldos_1[ultima_parcela]:,.2f}", ha='center', va='bottom', fontsize=8, color='blue')
plt.text(meses[ultima_parcela], saldos_2[ultima_parcela] - offset, f"{saldos_2[ultima_parcela]:,.2f}", ha='center', va='top', fontsize=8, color='red')

plt.title("Evolução dos Saldos - Cenário 1 vs Cenário 2")
plt.xlabel("Meses")
plt.ylabel("Saldo acumulado (R$)")
plt.grid(True)
plt.legend()
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

