package com.equipgrid.payment.service;

import com.equipgrid.payment.dto.request.CompleteRefundRequest;
import com.equipgrid.payment.dto.request.SubmitProofRequest;
import com.equipgrid.payment.dto.request.VerifyProofRequest;
import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.entity.RefundTransaction;
import java.util.List;

public interface IPaymentOperationsService {

  PaymentProof submitPaymentProof(SubmitProofRequest request);

  List<PaymentProof> getPendingProofs();

  PaymentProof verifyPaymentProof(Long id, VerifyProofRequest request);

  List<RefundTransaction> getAllRefunds();

  RefundTransaction completeRefund(Long id, CompleteRefundRequest request);
}
