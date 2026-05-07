-- Additional Stanford-relevant communities (idempotent by name).

insert into public.food_circles (name, description, icon_type)
select v.name, v.description, v.icon_type
from (
  values
    ('Free Food Alerts', 'Real-time free food from events, clubs, and leftovers near campus.', '🍕'),
    ('Stanford Dining Hacks', 'Navigating dining halls, meal swipes, and the best stations.', '🍽️'),
    ('CS / Tech Social Food', 'Pizza nights, recruiting dinners, and hackathon snacks.', '💻'),
    ('Farmers Market & Town', 'California Ave, Palo Alto farmers market, and weekend runs.', '🥕'),
    ('Halal & Kosher Eats', 'Dietary-friendly spots and group orders.', '🕌'),
    ('Budget Bites', 'Deals, leftovers, and under-$10 meals students actually eat.', '💵'),
    ('Study Spots + Snacks', 'Quiet cafes, libraries, and places to caffeinate between classes.', '📚'),
    ('Athletics Fuel', 'Pre/post-practice meals and high-protein picks.', '🏃'),
    ('Grad Student Grub', 'Late seminars, journal clubs, and department spreads.', '🎓'),
    ('Parents Weekend Picks', 'Nicer sit-downs when family is visiting.', '🥂')
) as v(name, description, icon_type)
where not exists (
  select 1 from public.food_circles fc where fc.name = v.name
);
