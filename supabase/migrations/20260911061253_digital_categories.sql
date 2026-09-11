-- Drei Kategorien fuer Equipment, das den Klang formt, ohne ein klassisches
-- Geraet zu sein. Begruendung in Abschnitt 3 der Spec vom 11.09.2026: rein
-- kommt, was den Klang formt, draussen bleibt, was das Signal nur
-- transportiert oder aufzeichnet (Interface, DAW, DI-Box).
--
-- Die sort_order-Werte liegen in den Luecken der bestehenden Zehnerschritte
-- und halten die Verstaerkungskette zusammen:
-- amp 30 -> modeller 35 -> cabinet 40 -> loadbox 45 -> plugin 47 -> pedal 50
insert into categories (id, is_consumable, sort_order) values
  ('modeller', false, 35),
  ('loadbox',  false, 45),
  ('plugin',   false, 47)
on conflict (id) do nothing;
