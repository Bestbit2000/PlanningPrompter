-- The one table the usage counter needs. The counter creates it by itself on first
-- use, so this file is for reference, or for setting the table up by hand.

create table if not exists usage_counts (
  day    date   not null,             -- UK date, no time
  event  text   not null,             -- one of six fixed names
  detail text   not null default '',  -- fixed labels, such as 'foundation_1|personalised'
  count  bigint not null default 0,   -- increased by one per event
  primary key (day, event, detail)
);
