// Util compartilhado pra transformar uma lista plana com `contaPaiId`
// (Plano de Contas e o DRE, que tem a mesma hierarquia) numa árvore
// navegável no frontend — o backend sempre devolve lista plana.

export type NoArvore<T> = T & { filhos: NoArvore<T>[] };

export function construirArvore<T extends { id: string; contaPaiId: string | null }>(
  lista: T[]
): NoArvore<T>[] {
  const porId = new Map<string, NoArvore<T>>();
  lista.forEach((item) => porId.set(item.id, { ...item, filhos: [] }));

  const raizes: NoArvore<T>[] = [];
  porId.forEach((no) => {
    const pai = no.contaPaiId ? porId.get(no.contaPaiId) : undefined;
    if (pai) pai.filhos.push(no);
    else raizes.push(no);
  });
  return raizes;
}

export function achatarComProfundidade<T extends { id: string; codigo: string; descricao: string }>(
  nos: NoArvore<T>[],
  profundidade = 0
): { id: string; rotulo: string }[] {
  return nos.flatMap((no) => [
    { id: no.id, rotulo: `${"— ".repeat(profundidade)}${no.codigo} · ${no.descricao}` },
    ...achatarComProfundidade(no.filhos, profundidade + 1),
  ]);
}
