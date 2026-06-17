create extension if not exists timescaledb;

create table if not exists instruments (
  id serial primary key,
  symbol text not null,
  type text not null check (type in ('index', 'stock')),
  display_name text not null,
  yesterday_close numeric(16, 4) not null,
  created_at timestamptz not null default now(),
  unique (type, symbol)
);

create table if not exists market_ticks (
  id bigserial,
  instrument_id integer not null references instruments(id) on delete cascade,
  time timestamptz not null,
  value numeric(16, 4) not null,
  yesterday_close numeric(16, 4) not null,
  source_payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (id, time)
);

select create_hypertable('market_ticks', 'time', if_not_exists => true);

create index if not exists idx_market_ticks_instrument_time
  on market_ticks (instrument_id, time desc);

create or replace function notify_market_tick_changed()
returns trigger
language plpgsql
as $$
declare
  instrument_row instruments%rowtype;
  tick_row market_ticks%rowtype;
begin
  tick_row := case when tg_op = 'DELETE' then old else new end;

  select *
    into instrument_row
    from instruments
   where id = tick_row.instrument_id;

  if instrument_row.id is null then
    return tick_row;
  end if;

  perform pg_notify(
    'market_ticks_changed',
    json_build_object(
      'action', tg_op,
      'instrumentId', instrument_row.id,
      'symbol', instrument_row.symbol,
      'type', instrument_row.type,
      'time', tick_row.time,
      'value', tick_row.value,
      'yesterdayClose', tick_row.yesterday_close
    )::text
  );

  return tick_row;
end;
$$;

drop trigger if exists trg_notify_market_tick_changed on market_ticks;

create trigger trg_notify_market_tick_changed
after insert or update or delete on market_ticks
for each row execute function notify_market_tick_changed();

create or replace function notify_instrument_changed()
returns trigger
language plpgsql
as $$
declare
  instrument_row instruments%rowtype;
begin
  instrument_row := case when tg_op = 'DELETE' then old else new end;

  perform pg_notify(
    'market_ticks_changed',
    json_build_object(
      'action', 'INVALIDATE',
      'instrumentId', instrument_row.id,
      'symbol', instrument_row.symbol,
      'type', instrument_row.type,
      'time', null,
      'value', null,
      'yesterdayClose', instrument_row.yesterday_close
    )::text
  );

  return instrument_row;
end;
$$;

drop trigger if exists trg_notify_instrument_changed on instruments;

create trigger trg_notify_instrument_changed
after update or delete on instruments
for each row execute function notify_instrument_changed();

insert into instruments (symbol, type, display_name, yesterday_close)
values
  ('DSEX', 'index', 'DSEX Index', 5222.22),
  ('GP', 'stock', 'Grameenphone PLC', 238.88)
on conflict (type, symbol) do update
set display_name = excluded.display_name,
    yesterday_close = excluded.yesterday_close;
