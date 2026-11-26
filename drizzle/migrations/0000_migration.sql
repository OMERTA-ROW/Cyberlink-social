DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.post_likes;
CREATE POLICY "Users view likes on visible posts" ON public.post_likes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id));

DROP POLICY IF EXISTS "Gifts are viewable by everyone" ON public.gifts;
CREATE POLICY "Signed-in users view gift catalog" ON public.gifts FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Signed-in users can view reviews" ON public.product_reviews;
CREATE POLICY "Users view reviews of visible products" ON public.product_reviews FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.products pr WHERE pr.id = product_reviews.product_id));

DROP POLICY IF EXISTS "Theater schedule is public" ON public.theater_event_catalog;
CREATE POLICY "Open or member theater events are visible" ON public.theater_event_catalog FOR SELECT TO anon, authenticated
USING (is_open = true OR host_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.is_theater_member(id, auth.uid())));