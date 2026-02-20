"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailNotificationData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmailNotification(data: EmailNotificationData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY not configured, skipping email notification",
      );
      return { success: false, error: "Email service not configured" };
    }

    const { data: result, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@maintenance-facility.com",
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject,
      html: data.html,
      text: data.text,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Unexpected email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function notifyAdminsNewRequest(requestData: {
  id: string;
  description: string;
  requester_name: string;
  category: string;
  priority: string;
  facility: string;
}) {
  const supabase = await createClient();

  try {
    // Get all admin users
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "Admin");

    if (error) throw error;

    if (!admins || admins.length === 0) {
      console.warn("No admin users found for notification");
      return { success: false, error: "No admin users found" };
    }

    const adminEmails = admins
      .map((admin: { email: string | null }) => admin.email)
      .filter((email): email is string => Boolean(email));

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          🛠️ New Maintenance Request
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Request Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Request ID:</strong> ${requestData.id}</li>
            <li><strong>Requester:</strong> ${requestData.requester_name}</li>
            <li><strong>Category:</strong> ${requestData.category}</li>
            <li><strong>Priority:</strong> ${requestData.priority}</li>
            <li><strong>Facility:</strong> ${requestData.facility}</li>
            <li><strong>Description:</strong> ${requestData.description}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            View in Admin Dashboard
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 12px; text-align: center;">
          This is an automated notification from the Maintenance Facility Management System.
        </p>
      </div>
    `;

    const textContent = `
      New Maintenance Request
      
      Request ID: ${requestData.id}
      Requester: ${requestData.requester_name}
      Category: ${requestData.category}
      Priority: ${requestData.priority}
      Facility: ${requestData.facility}
      Description: ${requestData.description}
      
      View in Admin Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard
    `;

    return await sendEmailNotification({
      to: adminEmails,
      subject: `New Maintenance Request: ${requestData.requester_name} - ${requestData.category}`,
      html: htmlContent,
      text: textContent,
    });
  } catch (error) {
    console.error("Error notifying admins:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function notifyUserRequestCompletion(requestData: {
  id: string;
  description: string;
  requester_email: string;
  requester_name: string;
  action_taken?: string;
  work_evaluation?: string;
}) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
          ✅ Maintenance Request Completed
        </h2>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #155724; margin: 0;">
            Dear ${requestData.requester_name},
          </p>
          <p style="color: #155724; margin: 10px 0;">
            Your maintenance request has been completed successfully.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Request Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Request ID:</strong> ${requestData.id}</li>
            <li><strong>Description:</strong> ${requestData.description}</li>
            ${requestData.action_taken ? `<li><strong>Action Taken:</strong> ${requestData.action_taken}</li>` : ""}
            ${requestData.work_evaluation ? `<li><strong>Work Evaluation:</strong> ${requestData.work_evaluation}</li>` : ""}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            View in Dashboard
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 12px; text-align: center;">
          This is an automated notification from the Maintenance Facility Management System.
        </p>
      </div>
    `;

    const textContent = `
      Maintenance Request Completed
      
      Dear ${requestData.requester_name},
      
      Your maintenance request has been completed successfully.
      
      Request ID: ${requestData.id}
      Description: ${requestData.description}
      ${requestData.action_taken ? `Action Taken: ${requestData.action_taken}` : ""}
      ${requestData.work_evaluation ? `Work Evaluation: ${requestData.work_evaluation}` : ""}
      
      View in Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
    `;

    return await sendEmailNotification({
      to: requestData.requester_email,
      subject: `Maintenance Request Completed: ${requestData.id}`,
      html: htmlContent,
      text: textContent,
    });
  } catch (error) {
    console.error("Error notifying user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
