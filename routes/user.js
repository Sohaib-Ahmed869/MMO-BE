// routes/users.js
const express = require("express");
const { supabase } = require("../config/supabase");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

// Get current user profile
router.get("/profile", async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        employee_id: req.user.employee_id,
        full_name: req.user.full_name,
        role: req.user.role,
        onboarding_status: req.user.onboarding_status,
        department: req.user.department,
        position: req.user.position,
        start_date: req.user.start_date,
        phone: req.user.phone,
        is_active: req.user.is_active,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const { full_name, department, position, phone } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({
        full_name,
        department,
        position,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Profile updated successfully",
      user: data,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (admin/manager only)
router.get("/", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      department,
      onboarding_status,
    } = req.query;

    let query = supabase.from("users").select("*");

    // Apply filters
    if (role) query = query.eq("role", role);
    if (department) query = query.eq("department", department);
    if (onboarding_status)
      query = query.eq("onboarding_status", onboarding_status);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      users: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID (admin/manager only)
router.get("/:id", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: data });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user (admin only)
router.put("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating sensitive fields through this endpoint
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "User updated successfully",
      user: data,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deactivate user (admin only)
router.patch("/:id/deactivate", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "User deactivated successfully",
      user: data,
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
