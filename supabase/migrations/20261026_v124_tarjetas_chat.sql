-- v1.24: las tarjetas con imagen que se comparten al chat (maestrías, trofeos, contrato, carnet…) van dentro del mensaje
-- como JPEG (hasta ~180 KB en base64). El límite de 20 KB del payload las rechazaba («kg_messages_payload_check»).
alter table public.kg_messages drop constraint if exists kg_messages_payload_check;
alter table public.kg_messages add constraint kg_messages_payload_check check (pg_column_size(payload) < 260000);
