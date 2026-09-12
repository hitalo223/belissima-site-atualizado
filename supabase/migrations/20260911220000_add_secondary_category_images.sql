-- Imagens da segunda grade de categorias da loja.

update public.categories
set image_url = case id
    when 'conjuntos' then 'assets/images/categoria-conjuntos.webp'
    when 'pijamas' then 'assets/images/categoria-pijamas.webp'
    when 'modeladores' then 'assets/images/categoria-modeladores.webp'
    when 'outlet' then 'assets/images/categoria-outlet.webp'
    else image_url
  end,
  media_type = 'image'
where id in ('conjuntos', 'pijamas', 'modeladores', 'outlet');
