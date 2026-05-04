import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { paymentService } from "./payment.service";

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.createPaymentIntent(
    req.params.orderId as string,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment intent created",
    data: result,
  });
});

const handleStripeWebhookEvent = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const result = await paymentService.handleStripeWebhookEvent(
      req.body as Buffer,
      sig
    );
    res.status(200).json(result);
  } catch (err: any) {
    res
      .status(err?.statusCode ?? 400)
      .json({ success: false, message: err?.message ?? "Webhook error" });
  }
};

export const PaymentController = {
  createPaymentIntent,
  handleStripeWebhookEvent,
};
