revoke all on table public.bd_signal_radar_items from anon;
revoke all on table public.bd_signal_radar_items from authenticated;
grant select, insert, update on table public.bd_signal_radar_items to authenticated;

revoke all on function public.bd_signal_radar_items_touch_updated_at() from public;
revoke all on function public.bd_signal_radar_items_touch_updated_at() from anon;
revoke all on function public.bd_signal_radar_items_touch_updated_at() from authenticated;
