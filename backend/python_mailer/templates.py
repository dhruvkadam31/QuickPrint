"""
QuickPrint Email Templates (Python)
Provides modern, responsive HTML and plain-text templates for:
- Authentication (Password Reset for Customers and Vendors)
- Order-Related Notifications (Confirmation, Printing, Ready for Pickup, Picked Up, Cancellation & Refund, Vendor New Order Alert)
"""

import html


def get_password_reset_template(to_email: str, reset_url: str, account_type: str = "CUSTOMER") -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Password Reset.
    """
    is_vendor = account_type.upper() == "VENDOR"
    portal_name = "Vendor Portal" if is_vendor else "Customer Portal"
    primary_color = "#059669" if is_vendor else "#4F46E5"
    subject = f"🔐 Reset Your QuickPrint {'Vendor ' if is_vendor else ''}Password"
    safe_to = html.escape(to_email)
    safe_url = html.escape(reset_url)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: {primary_color}; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
        {'🏪 QuickPrint Vendor Portal' if is_vendor else '🖨️ QuickPrint'}
      </h1>
      <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">Smart Campus Printing Platform</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;">Password Reset Request</h2>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
        We received a request to reset the password for your QuickPrint {portal_name} account (<strong>{safe_to}</strong>).
      </p>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        To create a new password, click the secure reset button below:
      </p>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="{safe_url}" style="background-color: {primary_color}; color: #ffffff; padding: 13px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;">
          Reset My Password
        </a>
      </div>

      <!-- Fallback URL -->
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 8px;">
        If the button does not work, copy and paste this link into your web browser:
      </p>
      <div style="word-break: break-all; font-size: 12px; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; color: #2563eb;">
        <a href="{safe_url}" style="color: #2563eb; text-decoration: underline;">{safe_url}</a>
      </div>

      <!-- Security Notice -->
      <div style="border-left: 4px solid #f59e0b; background-color: #fffbeb; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
        <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
          <strong>Security Notice:</strong> This link expires in <strong>15 minutes</strong> and can only be used once. If you did not make this request, you can safely ignore this email; your account remains secure.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      QuickPrint Smart Printing Platform • Academic Community Printing
    </div>
  </div>
</body>
</html>"""

    text_content = (
        f"QuickPrint Password Reset Request\n\n"
        f"We received a request to reset the password for your QuickPrint {portal_name} account ({to_email}).\n\n"
        f"Click the link below to set your new password:\n{reset_url}\n\n"
        f"This link is valid for 15 minutes. If you did not request this, please ignore this email.\n"
    )

    return subject, html_content, text_content


def get_order_confirmation_template(order: dict, user_email: str = None) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Order Confirmation.
    Prominently displays Order ID and Pickup OTP.
    """
    order_id = html.escape(str(order.get("orderId", "")))
    subject = f"Order Confirmation #{order_id} - QuickPrint"

    files = order.get("files")
    if isinstance(files, list) and len(files) > 0:
        names = [f.get("originalName") or f.get("name") or "File" for f in files if isinstance(f, dict)]
        file_names = ", ".join(names) if names else "Document"
    else:
        file_names = order.get("originalFileName") or order.get("fileName") or "Document"
    file_names = html.escape(file_names)

    service_type = html.escape(str(order.get("serviceType", "Print")))
    total_pages = order.get("totalPages") or order.get("pageCount") or 1
    price_val = order.get("estimatedPrice", 0)
    price_str = f"₹{price_val}" if price_val else "Paid"
    vendor_shop = html.escape(str(order.get("vendorName") or "Print Partner"))
    wait_time = order.get("predictedWaitTime") or 10
    otp = html.escape(str(order.get("otp", "Available in Dashboard")))

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">🖨️ QuickPrint</h1>
      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Smart Campus Printing Platform</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;">Order Confirmed!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Thank you for your order! Your document has been sent to the printer queue.
      </p>

      <!-- Pickup OTP Banner -->
      <div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 10px; padding: 18px; margin: 20px 0; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">Pickup Verification OTP</div>
        <div style="font-size: 32px; font-weight: 800; color: #166534; letter-spacing: 6px; margin: 8px 0;">{otp}</div>
        <div style="font-size: 12px; color: #4b5563;">Show this 6-digit code at the counter when collecting your printouts.</div>
      </div>

      <!-- Order Details Table -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; font-size: 14px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Order ID:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">{order_id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Service Type:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">{service_type}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Files:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">{file_names}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Total Pages:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">{total_pages}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Amount:</td>
            <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #16a34a;">{price_str}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Print Shop:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">{vendor_shop}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Est. Wait Time:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">~{wait_time} mins</td>
          </tr>
        </table>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        You can check live queue progress under <strong>My Orders</strong> on QuickPrint.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      QuickPrint Smart Printing Platform • Academic Community Printing
    </div>
  </div>
</body>
</html>"""

    text_content = (
        f"QuickPrint Order Confirmed!\n\n"
        f"Order ID: {order_id}\n"
        f"Pickup OTP: {otp}\n"
        f"Shop: {vendor_shop}\n"
        f"Amount: {price_str}\n"
        f"Total Pages: {total_pages}\n"
        f"Est. Wait Time: ~{wait_time} mins\n\n"
        f"Show your 6-digit OTP at the shop counter when picking up your printouts.\n"
    )

    return subject, html_content, text_content


def get_order_status_update_template(order: dict, user_email: str = None) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Order Status Updates (Printing / Ready).
    """
    order_id = html.escape(str(order.get("orderId", "")))
    status = order.get("status", "In Progress")
    is_ready = status == "Ready"

    subject = (
        f"🎉 Your Order is Ready for Pickup! #{order_id} - QuickPrint"
        if is_ready
        else f"🔄 Order is Printing #{order_id} - QuickPrint"
    )

    status_color = "#16a34a" if is_ready else "#0284c7"
    vendor_shop = html.escape(str(order.get("vendorName") or "Print Partner"))
    vendor_addr = order.get("vendorAddress")
    safe_addr = html.escape(str(vendor_addr)) if vendor_addr else None
    otp = html.escape(str(order.get("otp", "")))

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: {status_color}; color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">
        {'✅ Ready for Pickup!' if is_ready else '🔄 Printing in Progress'}
      </h1>
      <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">Order #{order_id}</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        {'Great news! Your print job is completed and waiting for you at the counter.' if is_ready else 'Your documents are currently on the printer and being processed.'}
      </p>

      {f'''
      <!-- Pickup OTP Banner -->
      <div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 10px; padding: 18px; margin: 20px 0; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase;">Your Pickup OTP</div>
        <div style="font-size: 32px; font-weight: 800; color: #166534; letter-spacing: 6px; margin: 8px 0;">{otp}</div>
        <div style="font-size: 12px; color: #4b5563;">Show this code at the shop counter to collect your documents.</div>
      </div>
      ''' if is_ready and otp else ''}

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; font-size: 14px; color: #334155;">
        <p style="margin: 6px 0;"><strong>Order ID:</strong> {order_id}</p>
        <p style="margin: 6px 0;"><strong>Status:</strong> <span style="font-weight: 700; color: {status_color};">{status}</span></p>
        <p style="margin: 6px 0;"><strong>Print Shop:</strong> {vendor_shop}</p>
        {f'<p style="margin: 6px 0;"><strong>Location:</strong> {safe_addr}</p>' if safe_addr else ''}
      </div>

      <p style="color: #64748b; font-size: 13px;">
        Please have your Order ID and OTP ready for quick handover.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      QuickPrint Smart Printing Platform
    </div>
  </div>
</body>
</html>"""

    text_content = (
        f"Your QuickPrint order #{order_id} is ready for pickup at {vendor_shop}!\nPickup OTP: {otp}\n"
        if is_ready
        else f"Your QuickPrint order #{order_id} is currently printing at {vendor_shop}.\n"
    )

    return subject, html_content, text_content


def get_order_picked_up_template(order: dict, user_email: str = None) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Order Picked Up (receipt).
    """
    order_id = html.escape(str(order.get("orderId", "")))
    subject = f"Order Picked Up #{order_id} - QuickPrint Receipt"
    vendor_shop = html.escape(str(order.get("vendorName") or "Print Partner"))
    price_val = order.get("estimatedPrice", 0)
    total_pages = order.get("totalPages") or order.get("pageCount") or 1

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <div style="background: linear-gradient(135deg, #059669, #047857); color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">📦 Order Collected</h1>
      <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">Thank you for using QuickPrint</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        Your order <strong>#{order_id}</strong> was verified and collected from <strong>{vendor_shop}</strong>.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; font-size: 14px; color: #334155;">
        <p style="margin: 6px 0;"><strong>Order ID:</strong> {order_id}</p>
        <p style="margin: 6px 0;"><strong>Total Pages:</strong> {total_pages}</p>
        <p style="margin: 6px 0;"><strong>Amount Paid:</strong> ₹{price_val}</p>
        <p style="margin: 6px 0;"><strong>Shop:</strong> {vendor_shop}</p>
      </div>

      <p style="color: #64748b; font-size: 13px;">
        If you have any questions or feedback, feel free to contact us through the QuickPrint dashboard.
      </p>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      QuickPrint Smart Printing Platform
    </div>
  </div>
</body>
</html>"""

    text_content = (
        f"Your QuickPrint order #{order_id} has been collected from {vendor_shop}.\n"
        f"Total Pages: {total_pages}\nAmount: ₹{price_val}\nThank you for choosing QuickPrint!\n"
    )

    return subject, html_content, text_content


def get_order_cancellation_template(order: dict, user_email: str = None, refund_info: dict = None) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Order Cancellation & Refund.
    """
    order_id = html.escape(str(order.get("orderId", "")))
    subject = f"Order Cancelled #{order_id} - QuickPrint"

    reason = html.escape(str(order.get("cancellationReason") or "Cancelled by user"))
    is_refunded = refund_info and (refund_info.get("refundId") or refund_info.get("refundStatus") == "processed")
    refund_amount = refund_info.get("refundAmount") if refund_info else order.get("estimatedPrice", 0)
    refund_id = html.escape(str(refund_info.get("refundId", ""))) if refund_info else ""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <div style="background-color: #dc2626; color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">❌ Order Cancelled</h1>
      <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">Order #{order_id}</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        Your order has been cancelled per your request.
      </p>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 18px; margin: 18px 0; font-size: 14px; color: #334155;">
        <p style="margin: 6px 0;"><strong>Order ID:</strong> {order_id}</p>
        <p style="margin: 6px 0;"><strong>Reason:</strong> {reason}</p>
        {f'''
        <hr style="border: none; border-top: 1px dashed #fca5a5; margin: 12px 0;" />
        <p style="margin: 6px 0; color: #16a34a; font-weight: 700;">Refund Initiated: ₹{refund_amount}</p>
        {f'<p style="margin: 4px 0; font-size: 12px; color: #555;"><strong>Refund ID:</strong> {refund_id}</p>' if refund_id else ''}
        <p style="margin: 4px 0; font-size: 12px; color: #64748b;">The refunded amount will reflect in your account within 3-5 business days.</p>
        ''' if is_refunded else '<p style="margin: 6px 0; font-size: 13px; color: #64748b;">No charge was incurred for this order.</p>'}
      </div>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      QuickPrint Smart Printing Platform
    </div>
  </div>
</body>
</html>"""

    text_content = (
        f"QuickPrint Order Cancelled\n\nOrder ID: {order_id}\nReason: {reason}\n"
        f"{f'Refund Initiated: ₹{refund_amount}' if is_refunded else ''}\n"
    )

    return subject, html_content, text_content


def get_vendor_new_order_template(order: dict, vendor_email: str) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) to alert Vendor of incoming print jobs.
    """
    order_id = html.escape(str(order.get("orderId", "")))
    subject = f"🔔 New Print Order Received #{order_id} - QuickPrint"

    customer_name = html.escape(str(order.get("userName") or "Student"))
    service_type = html.escape(str(order.get("serviceType") or "Print"))
    files = order.get("files")
    file_count = len(files) if isinstance(files, list) and files else 1
    total_pages = order.get("totalPages") or order.get("pageCount") or 1
    payout = order.get("vendorEarnings") or round(order.get("estimatedPrice", 0) * 0.9, 2)
    instructions = order.get("instructions")
    safe_instructions = html.escape(str(instructions)) if instructions else None

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <div style="background: linear-gradient(135deg, #065f46, #047857); color: #ffffff; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">🏪 New Order Received</h1>
      <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">QuickPrint Vendor Network</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        A new print order has been placed for your shop:
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; font-size: 14px; color: #334155;">
        <p style="margin: 6px 0;"><strong>Order ID:</strong> {order_id}</p>
        <p style="margin: 6px 0;"><strong>Customer:</strong> {customer_name}</p>
        <p style="margin: 6px 0;"><strong>Service:</strong> {service_type}</p>
        <p style="margin: 6px 0;"><strong>Files:</strong> {file_count} file(s)</p>
        <p style="margin: 6px 0;"><strong>Total Pages:</strong> {total_pages}</p>
        <p style="margin: 6px 0; color: #16a34a; font-weight: 700;"><strong>Your Payout:</strong> ₹{payout}</p>
        {f'<p style="margin: 6px 0; color: #b45309;"><strong>Instructions:</strong> {safe_instructions}</p>' if safe_instructions else ''}
      </div>

      <p style="color: #64748b; font-size: 13px;">
        Please open your Vendor Dashboard to review, download files, and start printing.
      </p>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      QuickPrint Vendor Portal
    </div>
  </div>
</body>
</html>"""

    text_content = (
        f"QuickPrint: New Order #{order_id} received for your shop!\n"
        f"Customer: {customer_name}\nService: {service_type}\nPages: {total_pages}\nPayout: ₹{payout}\n"
    )

    return subject, html_content, text_content


def get_test_email_template(to_email: str) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for testing SMTP.
    """
    subject = "🧪 QuickPrint Python SMTP Test Notification"
    safe_to = html.escape(to_email)
    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
    <h2 style="color: #10b981; margin-top: 0;">✅ Python SMTP Engine Connected Successfully!</h2>
    <p style="color: #334155;">This is a test notification confirming that Python's <code>smtplib</code> is operational.</p>
    <p style="color: #64748b; font-size: 13px;">Recipient: <strong>{safe_to}</strong></p>
  </div>
</body>
</html>"""
    text_content = f"Python SMTP Test: Connection operational for {to_email}."
    return subject, html_content, text_content
