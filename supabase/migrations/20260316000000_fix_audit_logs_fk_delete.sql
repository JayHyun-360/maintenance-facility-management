-- Fix foreign key constraint on audit_logs to allow profile deletion
-- Change actor_id from RESTRICT to SET NULL so profiles can be deleted

ALTER TABLE public.audit_logs 
DROP CONSTRAINT audit_logs_actor_id_fkey;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;
