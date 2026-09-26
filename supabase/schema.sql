-- 넥스트레벨 유소년 농구캠프 데이터 — Supabase(Postgres) 스키마
-- Supabase 대시보드 SQL Editor에서 한 번 실행한다.

create extension if not exists pgcrypto;

create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  gender       text not null check (gender in ('M', 'F')),
  birth_year   int  check (birth_year between 1990 and 2030),  -- 생년 (없으면 null → "나이 미입력")
  grade        text,                                            -- 학년 (예: 초6, 중1)
  team         text,                                            -- 소속팀
  access_code  text not null unique,                            -- 선수·보호자용 리포트 코드 (XXXX-XXXX)
  created_at   timestamptz not null default now()
);
-- 동일인 후보 탐색용 (이름 + 성별 + 생년)
create index if not exists players_identity_idx on players (name, gender, birth_year);

create table if not exists camps (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  date      date not null,
  location  text
);

-- 롱 포맷: 선수 × 캠프 × 지표 1행
create table if not exists measurements (
  player_id           uuid not null references players (id) on delete cascade,
  camp_id             uuid not null references camps (id) on delete cascade,
  metric_key          text not null,           -- src/lib/metrics.ts RAW_METRICS의 key
  value               double precision not null,
  age_at_measurement  int,                     -- 측정 당시 나이 (캠프 연도 − 생년)
  primary key (player_id, camp_id, metric_key)
);
create index if not exists measurements_camp_idx on measurements (camp_id);

-- 측정오류 기준표 (관리자 수정 가능). 비어 있으면 앱의 기본값을 쓴다.
create table if not exists validation_rules (
  id           text primary key,
  metric_keys  text[] not null,
  label        text not null,
  op           text not null check (op in ('lt', 'gt')),
  threshold    double precision not null,
  note         text,
  enabled      boolean not null default true,
  sort_order   int not null default 0
);

insert into validation_rules (id, metric_keys, label, op, threshold, note, enabled, sort_order) values
  ('grf-min',       '{peak_grf}',                  '최대 지면반력 하한', 'lt', 300, '체중 대비 불가능한 값 (정상 700~1700N)', true, 0),
  ('prep-step-max', '{prep_time_l,prep_time_r}',   '예비스텝 시간 상한', 'gt', 0.5, '스텝 검출 실패 (정상 범위 0.06~0.33s)', true, 1),
  ('last-step-max', '{last_time_l,last_time_r}',   '마지막스텝 시간 상한', 'gt', 0.8, '스텝 검출 실패 (정상 범위 0.25~0.55s)', true, 2)
on conflict (id) do nothing;

-- 개인정보 보호: RLS를 켜고 공개(anon) 정책을 만들지 않는다.
-- 앱 서버만 서비스 롤 키로 접근하므로 브라우저에서 직접 조회할 수 없다.
alter table players          enable row level security;
alter table camps            enable row level security;
alter table measurements     enable row level security;
alter table validation_rules enable row level security;
