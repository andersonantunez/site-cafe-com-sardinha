# Assets dos produtos

- `source/`: imagens-base usadas por `compose_products.py`.
- `legacy-variants/`: variantes preservadas que estavam na pasta provisória
  `Nova pasta`; não são importadas pela aplicação.
- `compose_products.py`: gera as imagens finais em
  `src/assets/images/products/` a partir das bases.
- `standardize_variants.py`: padroniza cores a partir das imagens mestras já
  existentes no diretório final.

Os arquivos `*-raw.png` usados durante a preparação visual eram intermediários
e não fazem parte do build do projeto.
