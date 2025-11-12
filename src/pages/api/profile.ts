import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1, "Imię i nazwisko nie może być puste").max(100).optional(),
  display_name: z.string().min(1, "Nazwa wyświetlana nie może być pusta").max(50).optional(),
});

/**
 * GET /api/profile
 * Returns current user profile data
 */
export const GET: APIRoute = async ({ locals }) => {
  const { user, supabase } = locals;

  if (!user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Musisz być zalogowany",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get user data from Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Nie można pobrać danych użytkownika",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Return user profile data
  return new Response(
    JSON.stringify({
      data: {
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || "",
        display_name: authUser.user.user_metadata?.display_name || "",
        created_at: authUser.user.created_at,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

/**
 * PATCH /api/profile
 * Updates user profile data
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  const { user, supabase } = locals;

  if (!user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Musisz być zalogowany",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "BAD_REQUEST",
          message: "Nieprawidłowy format danych",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate input
  const validation = ProfileUpdateSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Nieprawidłowe dane",
          details: validation.error.flatten().fieldErrors,
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { full_name, display_name } = validation.data;

  // Update user metadata in Supabase Auth
  const updateData: { data: Record<string, string> } = {
    data: {},
  };

  if (full_name !== undefined) {
    updateData.data.full_name = full_name;
  }
  if (display_name !== undefined) {
    updateData.data.display_name = display_name;
  }

  const { data: updatedUser, error: updateError } = await supabase.auth.updateUser(updateData);

  if (updateError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UPDATE_FAILED",
          message: "Nie udało się zaktualizować profilu",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      data: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        full_name: updatedUser.user.user_metadata?.full_name || "",
        display_name: updatedUser.user.user_metadata?.display_name || "",
        created_at: updatedUser.user.created_at,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
