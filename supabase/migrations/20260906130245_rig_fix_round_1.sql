-- Fix round 1 (Task 9): the one-level depth invariant could be broken by an
-- UPDATE. The original enforce_gear_item_rules() only checked the row being
-- written against its TARGET's state (is the target already installed
-- somewhere, does the target belong to the same owner). It never checked
-- whether anything already points AT the row being written. So with pickup
-- P installed in guitar G, `update gear_items set installed_in_id = X
-- where id = G` passed both RLS (owner_id unchanged) and the trigger (X was
-- free), producing the three-deep chain P -> G -> X. The same one-sided gap
-- meant an owner_id change on a row with children was never rechecked
-- against those children, so an installed-in relationship could end up
-- spanning two owners once anything can reassign ownership.
--
-- The complete invariant, stated once instead of patched per case: a row
-- that has children must remain a valid parent. If anything currently
-- points at this row via installed_in_id, this row may not itself be given
-- an installed_in_id, and its owner_id may not change.
create or replace function enforce_gear_item_rules()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  target gear_items%rowtype;
  has_children boolean;
begin
  if is_consumable_item(new.catalog_item_id) then
    raise exception 'consumable items belong in preferences, not in gear_items';
  end if;

  select exists (
    select 1 from gear_items where installed_in_id = new.id
  ) into has_children;

  if has_children then
    if new.installed_in_id is not null then
      raise exception 'installation is one level deep only';
    end if;

    if tg_op = 'UPDATE' and new.owner_id <> old.owner_id then
      raise exception 'gear can only be installed in an item of the same owner';
    end if;
  end if;

  if new.installed_in_id is not null then
    if new.installed_in_id = new.id then
      raise exception 'a gear item cannot be installed in itself';
    end if;

    select * into target from gear_items where id = new.installed_in_id;

    if not found then
      raise exception 'target gear item % not found', new.installed_in_id;
    end if;

    if target.owner_id <> new.owner_id then
      raise exception 'gear can only be installed in an item of the same owner';
    end if;

    if target.installed_in_id is not null then
      raise exception 'installation is one level deep only';
    end if;
  end if;

  return new;
end;
$fn$;
