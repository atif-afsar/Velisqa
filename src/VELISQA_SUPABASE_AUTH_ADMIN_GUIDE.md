# VELISQA Supabase Auth + Admin Login Implementation Guide

This guide is written for a **React + Vite** app and explains how to add:

- User sign up / sign in
- Google login
- Admin login
- Protected user routes
- Protected admin dashboard
- Product CRUD permission structure
- Supabase database tables
- Row Level Security policies

---

## 1. Final App Structure

Create or update your project structure like this:

```txt
src/
│
├── lib/
│   └── supabaseClient.js
│
├── context/
│   └── AuthContext.jsx
│
├── components/
│   ├── ProtectedRoute.jsx
│   └── AdminRoute.jsx
│
├── pages/
│   ├── Login.jsx
│   ├── AdminLogin.jsx
│   ├── AdminDashboard.jsx
│   ├── Products.jsx
│   └── ProductDetails.jsx
│
├── App.jsx
└── main.jsx
```

---

## 2. Install Supabase

Run this command in your React project:

```bash
npm install @supabase/supabase-js
```

---

## 3. Create Supabase Project

1. Go to Supabase.
2. Create a new project.
3. Copy these values:

```txt
Project URL
Anon Public Key
```

4. Create a `.env` file in your React project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Important: Restart your dev server after creating `.env`.

```bash
npm run dev
```

---

## 4. Create Supabase Client

Create this file:

```txt
src/lib/supabaseClient.js
```

Add this code:

```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 5. Create Database Tables

Go to Supabase Dashboard → SQL Editor → New Query.

Run this SQL:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  description text,
  category text,
  image_url text,
  stock integer default 1,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);
```

---

## 6. Enable Row Level Security

Run this SQL:

```sql
alter table public.profiles enable row level security;
alter table public.products enable row level security;
```

---

## 7. Create Helper Function to Check Admin

Run this SQL:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;
```

---

## 8. Add RLS Policies

Run this SQL:

```sql
-- Profiles policies

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Products policies

create policy "Anyone can view products"
on public.products
for select
to anon, authenticated
using (true);

create policy "Only admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin());

create policy "Only admins can update products"
on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Only admins can delete products"
on public.products
for delete
to authenticated
using (public.is_admin());
```

---

## 9. Automatically Create Profile After Signup

Run this SQL:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

---

## 10. Make Yourself Admin

First sign up once from your website.

Then go to Supabase → Authentication → Users.

Copy your user ID.

Now run:

```sql
update public.profiles
set role = 'admin'
where id = 'PASTE_YOUR_USER_ID_HERE';
```

Only this user can access the admin dashboard and perform product CRUD.

---

## 11. Enable Email Login

Go to:

```txt
Supabase Dashboard → Authentication → Providers → Email
```

Enable:

```txt
Email provider
Confirm email: optional during development
```

For development, you can keep email confirmation OFF.

For production, turn it ON.

---

## 12. Enable Google Login

Go to:

```txt
Supabase Dashboard → Authentication → Providers → Google
```

You need:

```txt
Google Client ID
Google Client Secret
```

Steps:

1. Open Google Cloud Console.
2. Create a project.
3. Go to APIs & Services → Credentials.
4. Create OAuth Client ID.
5. Select Web Application.
6. Add Authorized Redirect URI from Supabase Google Provider page.
7. Copy Client ID and Client Secret.
8. Paste them into Supabase Google Provider.
9. Save.

Also add your website URL in Supabase:

```txt
Authentication → URL Configuration
Site URL: https://www.velisqa.com
Redirect URLs:
http://localhost:5173/**
https://www.velisqa.com/**
```

---

## 13. Create Auth Context

Create:

```txt
src/context/AuthContext.jsx
```

Add:

```jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        setUser(data.session.user);
        await loadProfile(data.session.user.id);
      }

      setLoading(false);
    }

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

---

## 14. Wrap App with AuthProvider

In `src/main.jsx`:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 15. Create User Login Page

Create:

```txt
src/pages/Login.jsx
```

Add:

```jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailAuth(e) {
    e.preventDefault();

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Account created successfully. Please login.");
      setIsSignup(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      navigate("/");
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <form
        onSubmit={handleEmailAuth}
        className="w-full max-w-md border rounded-2xl p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold mb-6 text-center">
          {isSignup ? "Create Account" : "Login to Continue"}
        </h1>

        {isSignup && (
          <input
            className="w-full border rounded-lg px-4 py-3 mb-4"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full border rounded-lg px-4 py-3 mb-4"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg px-4 py-3 mb-4"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="w-full bg-purple-700 text-white rounded-lg py-3">
          {isSignup ? "Sign Up" : "Login"}
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full border rounded-lg py-3 mt-4"
        >
          Continue with Google
        </button>

        <p className="text-center mt-4 text-sm">
          {isSignup ? "Already have an account?" : "New customer?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-purple-700 font-medium"
          >
            {isSignup ? "Login" : "Create account"}
          </button>
        </p>
      </form>
    </div>
  );
}
```

---

## 16. Create Admin Login Page

Create:

```txt
src/pages/AdminLogin.jsx
```

Add:

```jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleAdminLogin(e) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();
      alert("Access denied. This login is only for admin.");
      return;
    }

    navigate("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <form
        onSubmit={handleAdminLogin}
        className="w-full max-w-md border rounded-2xl p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Admin Login
        </h1>

        <input
          className="w-full border rounded-lg px-4 py-3 mb-4"
          placeholder="Admin Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg px-4 py-3 mb-4"
          placeholder="Admin Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="w-full bg-purple-700 text-white rounded-lg py-3">
          Login as Admin
        </button>
      </form>
    </div>
  );
}
```

---

## 17. Create Protected User Route

Create:

```txt
src/components/ProtectedRoute.jsx
```

Add:

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## 18. Create Protected Admin Route

Create:

```txt
src/components/AdminRoute.jsx
```

Add:

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
```

---

## 19. Setup Routes

Update `src/App.jsx`:

```jsx
import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Products />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route
        path="/product/:id"
        element={
          <ProtectedRoute>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
```

---

## 20. Create Admin Dashboard Basic CRUD

Create:

```txt
src/pages/AdminDashboard.jsx
```

Add:

```jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { logout } = useAuth();

  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProducts(data);
    }
  }

  async function addProduct(e) {
    e.preventDefault();

    const { error } = await supabase.from("products").insert({
      name,
      price: Number(price),
      image_url: imageUrl,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setPrice("");
    setImageUrl("");
    fetchProducts();
  }

  async function deleteProduct(id) {
    const confirmDelete = window.confirm("Delete this product?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProducts();
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <button onClick={logout} className="border px-4 py-2 rounded-lg">
          Logout
        </button>
      </div>

      <form onSubmit={addProduct} className="grid gap-4 border p-4 rounded-2xl mb-8">
        <h2 className="text-xl font-medium">Add Product</h2>

        <input
          className="border rounded-lg px-4 py-3"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="border rounded-lg px-4 py-3"
          placeholder="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          className="border rounded-lg px-4 py-3"
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <button className="bg-purple-700 text-white rounded-lg py-3">
          Add Product
        </button>
      </form>

      <div className="grid md:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border rounded-2xl p-4">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
            )}

            <h3 className="font-medium">{product.name}</h3>
            <p>₹{product.price}</p>

            <button
              onClick={() => deleteProduct(product.id)}
              className="mt-4 w-full bg-red-600 text-white rounded-lg py-2"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 21. Protect WhatsApp Order Button

In your Product Details page, use this logic:

```jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ProductDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const productName = "VELISQA Product";
  const price = "1499";

  function handleOrder() {
    if (!user) {
      navigate("/login");
      return;
    }

    const message = `Hello VELISQA, I want to order ${productName} priced at ₹${price}.`;
    const whatsappNumber = "91XXXXXXXXXX";
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  return (
    <button
      onClick={handleOrder}
      className="bg-purple-700 text-white px-6 py-3 rounded-lg"
    >
      Order on WhatsApp
    </button>
  );
}
```

Replace:

```txt
91XXXXXXXXXX
```

with your real WhatsApp business number.

---

## 22. Optional: Product Image Upload Later

First complete product CRUD with image URL.

After that, add Supabase Storage upload.

Recommended storage bucket name:

```txt
product-images
```

Do image upload only after login/admin functionality is working.

---

## 23. Testing Checklist

Test in this order:

```txt
1. Website opens without error
2. User can create account
3. User profile is created in profiles table
4. User can login
5. User can logout
6. User cannot access admin dashboard
7. Your admin email is changed to role admin
8. Admin can login from /admin-login
9. Admin can open /admin/dashboard
10. Admin can add product
11. Admin can delete product
12. Normal user cannot insert/delete products directly
13. WhatsApp order button redirects guest user to /login
14. WhatsApp order button opens WhatsApp after login
```

---

## 24. Common Errors and Fixes

### Error: Missing Supabase URL or Key

Fix:

```txt
Check .env file.
Restart npm run dev.
Variable names must start with VITE_.
```

### Error: User profile not found

Fix:

```txt
Make sure trigger handle_new_user is created.
Create a new test user after trigger is added.
Old users may need manual profile rows.
```

### Error: Admin dashboard redirects to home

Fix:

```txt
Check profiles table.
Your logged-in user must have role = admin.
```

### Error: RLS blocks product insert

Fix:

```txt
Check is_admin() function.
Check your profile role.
Check insert policy on products table.
```

### Error: Google login redirect issue

Fix:

```txt
Check Supabase Redirect URLs.
Add localhost URL.
Add production domain URL.
Check Google Cloud authorized redirect URI.
```

---

## 25. Cursor Execution Order

Give Cursor prompts in this order:

```txt
1. Install Supabase and create client.
2. Add AuthContext.
3. Add user login page.
4. Add admin login page.
5. Add ProtectedRoute and AdminRoute.
6. Setup App routes.
7. Add AdminDashboard basic product CRUD.
8. Connect product listing to Supabase.
9. Protect WhatsApp order button.
10. Add Supabase Storage image upload.
```

Do not ask Cursor to do everything in one prompt. Complete one step, test it, then continue.

---

## 26. Final Security Note

Never expose Supabase service role key in React.

Only use:

```txt
VITE_SUPABASE_ANON_KEY
```

Admin security should come from:

```txt
profiles.role = admin
RLS policies
AdminRoute frontend protection
```

The real protection is Supabase RLS, not only React routes.
