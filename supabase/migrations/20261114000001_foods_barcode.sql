-- Escáner de código de barras (Open Food Facts): código EAN/UPC normalizado del alimento.
alter table public.foods add column barcode text;

-- Un mismo código no se repite por usuario (los alimentos sin código no cuentan).
create unique index foods_user_barcode_uniq on public.foods (user_id, barcode) where barcode is not null;
