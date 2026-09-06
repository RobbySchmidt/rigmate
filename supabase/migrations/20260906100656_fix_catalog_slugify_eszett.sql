-- translate() ersetzt nur Zeichen fuer Zeichen und kann ein einzelnes
-- Zeichen nicht in zwei umwandeln. Damit fiel "ss" fuer 'ss' auf ein
-- einzelnes 's', z. B. "Groesse" -> "grose" statt "grosse". Der Ersatz
-- laeuft deshalb vorab per replace(), translate() bleibt fuer die
-- verbleibenden Umlaute zustaendig.
create or replace function slugify(input text)
returns text
language sql
immutable
as $fn$
  select trim(both '-' from regexp_replace(
    lower(translate(replace(input, 'ß', 'ss'), 'äöüÄÖÜ', 'aouAOU')),
    '[^a-z0-9]+', '-', 'g'
  ));
$fn$;
