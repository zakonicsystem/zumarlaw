export async function logoutStaff({ request, storage, redirect, isEmployee }) {
  try { await request(); }
  catch { /* Local sign-out must still complete if the session expired or the API is unavailable. */ }
  finally {
    for (const key of ['adminToken', 'employeeToken', 'isSuperAdmin', 'employeeName', 'assignedPages']) storage.removeItem(key);
    redirect(isEmployee ? '/admin/employee-login' : '/admin/login', { replace: true });
  }
}
