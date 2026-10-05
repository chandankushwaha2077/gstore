-- Run this whole file once in Supabase > SQL Editor. Safe to re-run (it wipes old tables first).
drop table if exists audit_logs,reports,templates,settings,profiles,units cascade;
drop function if exists is_ho(),my_unit(),set_report_no(),guard_unit(),has_ho(),bootstrap_ho(text,text) cascade;
create table units(id serial primary key,code text unique not null,name text not null,is_ho boolean default false,title text default '',reg text default '',lic text default '',h1 text default '',h2 text default '',h3 text default '',footer text default '',logo text default '',bg text default '',bg_op numeric default .08,bg_text text default '',can_edit boolean default false);
create table profiles(id uuid primary key references auth.users on delete cascade,username text unique not null,full_name text,role text check(role in('ho','branch')) not null,unit_id int references units(id),active boolean default true);
create table templates(id serial primary key,code text unique,name text,scope text default 'both',status text default 'active',fields jsonb default '[]',body text default '');
create table reports(id serial primary key,no text unique,unit_id int not null references units(id),template_id int references templates(id),created_by uuid,data jsonb default '{}',status text default 'draft' check(status in('draft','final','cancelled')),created_at timestamptz default now());
create table settings(key text primary key,value jsonb);
create table audit_logs(id serial primary key,user_id uuid,username text,action text,description text,created_at timestamptz default now());

create function is_ho() returns boolean language sql security definer set search_path=public stable as $$select exists(select 1 from profiles where id=auth.uid() and role='ho' and active)$$;
create function my_unit() returns int language sql security definer set search_path=public stable as $$select unit_id from profiles where id=auth.uid() and active$$;

create function set_report_no() returns trigger language plpgsql security definer set search_path=public as $$
declare c text; n int; y int:=extract(year from now());
begin select code into c from units where id=new.unit_id;
 select coalesce(max(split_part(no,'/',4)::int),0)+1 into n from reports where unit_id=new.unit_id and no like 'SWL/'||c||'/'||y||'/%';
 new.no:='SWL/'||c||'/'||y||'/'||lpad(n::text,5,'0'); new.created_by:=auth.uid(); return new; end $$;
create trigger t_rno before insert on reports for each row execute function set_report_no();

create function guard_unit() returns trigger language plpgsql security definer set search_path=public as $$
begin if not is_ho() then new.code:=old.code;new.name:=old.name;new.is_ho:=old.is_ho;new.can_edit:=old.can_edit; end if; return new; end $$;
create trigger t_guard before update on units for each row execute function guard_unit();

alter table units enable row level security;alter table profiles enable row level security;alter table templates enable row level security;
alter table reports enable row level security;alter table settings enable row level security;alter table audit_logs enable row level security;

create policy u_sel on units for select to authenticated using(is_ho() or id=my_unit());
create policy u_ins on units for insert to authenticated with check(is_ho());
create policy u_del on units for delete to authenticated using(is_ho());
create policy u_upd on units for update to authenticated using(is_ho() or (id=my_unit() and can_edit));
create policy p_sel on profiles for select to authenticated using(is_ho() or id=auth.uid());
create policy p_ins on profiles for insert to authenticated with check(is_ho());
create policy p_upd on profiles for update to authenticated using(is_ho());
create policy t_sel on templates for select to authenticated using(is_ho() or (scope<>'ho' and status='active'));
create policy t_all on templates for all to authenticated using(is_ho()) with check(is_ho());
create policy r_sel on reports for select to authenticated using(is_ho() or unit_id=my_unit());
create policy r_ins on reports for insert to authenticated with check(is_ho() or unit_id=my_unit());
create policy r_upd on reports for update to authenticated using(is_ho() or unit_id=my_unit());
create policy r_del on reports for delete to authenticated using(is_ho() or (unit_id=my_unit() and status='draft'));
create policy s_sel on settings for select to authenticated using(true);
create policy s_all on settings for all to authenticated using(is_ho()) with check(is_ho());
create policy a_ins on audit_logs for insert to authenticated with check(user_id=auth.uid());
create policy a_sel on audit_logs for select to authenticated using(is_ho());

insert into settings values('org',jsonb_build_object('h1','स्वस्तिक लघुवित्त वित्तीय संस्था लि.','h2','SWASTIK LAGHUBITTA BITTIYA SANSTHA LTD.','h3','नेपाल राष्ट्र बैंकबाट "घ" वर्गको इजाजतपत्रप्राप्त संस्था, प्रादेशिकस्तर (मधेश प्रदेश)'));
insert into units(code,name,is_ho,title,footer) values('HO','Head Office',true,'केन्द्रीय कार्यालय लहान, सिराहा','Head Office : Lahan, Siraha');
insert into units(code,name,title,reg,lic,footer) values('BAR','Bardibas','शाखा कार्यालय बर्दिवास, महोत्तरी','कम्पनी दर्ता नं. : २०१२९२/०७५/०७६','इजाजतपत्र नं. ने.रा.बैंक/इ.प्रा./"घ"/८९/०७५/०७६','Branch Office : Bardibas, Mahottari, Mob : 9701002550, Email : swastik.bardibas@gmail.com, Web : www.swastikmicrofinance.com');
insert into templates(code,name,fields,body) values('LTR01','Branch Letter (Bardibas format)',
$j$[{"name":"ref","label":"च.न.","type":"text"},{"name":"miti","label":"मिति","type":"text"},{"name":"recipient","label":"प्राप्तकर्ता","type":"textarea"},{"name":"subject","label":"बिषय","type":"text"},{"name":"body","label":"मुख्य विवरण","type":"textarea"},{"name":"details","label":"तपशिल (प्रति लाइन एक row, | ले column छुट्याउनुहोस्)","type":"table","cols":["क्र.स.","केन्द्र नं.","सदस्य संख्या","विघटन गर्नुपर्ने कारण"]},{"name":"signer","label":"हस्ताक्षरकर्ता","type":"text"},{"name":"post","label":"पद","type":"text"},{"name":"cc","label":"बोधार्थ","type":"textarea"}]$j$::jsonb,
$b$च.न. {{ref}} || मिति : {{miti}} गते

{{recipient}}

**बिषय : {{subject}}**

महोदय,

{{body}}

तपशिल :-
{{details}}

भवदीय,


{{signer}}
{{post}}

**बोधार्थ,**
{{cc}}$b$);

create function has_ho() returns boolean language sql security definer set search_path=public stable as $$select exists(select 1 from profiles where role='ho')$$;
grant execute on function has_ho() to anon,authenticated;
create function bootstrap_ho(p_username text,p_name text) returns void language plpgsql security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'Not logged in'; end if;
 if exists(select 1 from profiles where role='ho') then raise exception 'Head Office admin already exists'; end if;
 insert into profiles(id,username,full_name,role,unit_id) values(auth.uid(),lower(p_username),p_name,'ho',(select id from units where is_ho limit 1)); end $$;
grant execute on function bootstrap_ho(text,text) to authenticated;
