import { useState, useEffect } from "react";
import { createUser, saveUserId } from "../../services/UserService";
import {
  getAcceptanceToken,
  createTransaction,
  updateTransactionDetails,
  clearAcceptanceToken,
  createGatewayTransaction,
  saveReference,
  tokenizeCard,
  getTransactionDetails,
} from "../../services/PaymentService";
import { createOrder } from "../../services/OrderService";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { clearCart } from "../../redux/cartSlice";
import "./Modal.css";

const Modal = ({ isOpen, onClose, onSubmitEmail }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [acceptanceToken, setAcceptanceToken] = useState("");
  const [acceptanceUrl, setAcceptanceUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    cvc: "",
    exp_month: "",
    exp_year: "",
    card_holder: "",
    installments: "",
  });
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (showPaymentForm) {
      const fetchAcceptanceToken = async () => {
        try {
          const data = await getAcceptanceToken();
          setAcceptanceToken(data.acceptance_token);
          setAcceptanceUrl(data.permalink);
        } catch (error) {
          setError("Error fetching acceptance token.");
        }
      };
      fetchAcceptanceToken();
    }
  }, [showPaymentForm]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setError("");
      setLoading(false);
      setShowPaymentForm(false);
      setAcceptanceToken("");
      setAcceptanceUrl("");
      setTermsAccepted(false);
      setCardDetails({
        number: "",
        cvc: "",
        exp_month: "",
        exp_year: "",
        card_holder: "",
        installments: "",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await createUser(email);

      if (![1, 2, 200].includes(result.status)) {
        throw new Error(result.message || "Error al crear el usuario.");
      }

      saveUserId(result.id);

      const dataOrder = await createOrder();

      if (dataOrder.status !== "PENDING") {
        throw new Error(dataOrder.message || "No se pudo crear la orden.");
      }

      const dataTransaction = await createTransaction(dataOrder.id);
      if (dataTransaction.status !== "PENDING") {
        throw new Error(
          dataTransaction.message || "No se pudo crear la transacción."
        );
      }

      saveReference(dataTransaction.reference);
      setShowPaymentForm(true);
      onSubmitEmail(email);
    } catch (error) {
      toast.error(
        error.message || "Ocurrió un error al procesar la solicitud."
      );
      setError(error.message || "Ocurrió un error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const handleCardDetailChange = (event) => {
    const { name, value } = event.target;
    setCardDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
  };

  const handleTermsChange = (event) => {
    setTermsAccepted(event.target.checked);
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!termsAccepted) {
      setError("Debe aceptar los términos y condiciones para proceder.");
      toast.error("Debe aceptar los términos y condiciones para proceder.");
      return;
    }

    setLoading(true);

    try {
      const tokenizationResponse = await tokenizeCard(cardDetails);

      if (
        tokenizationResponse.status !== undefined &&
        tokenizationResponse.status !== 1
      ) {
        throw new Error(
          tokenizationResponse.message || "Error al tokenizar la tarjeta."
        );
      }

      const reference = localStorage.getItem("reference");
      const installments = cardDetails.installments;

      if (!reference || isNaN(installments)) {
        throw new Error("Datos faltantes para procesar la transacción.");
      }

      const gatewayTransactionResponse = await createGatewayTransaction(
        tokenizationResponse,
        installments
      );
      clearAcceptanceToken();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const transactionDetails = await getTransactionDetails(
        gatewayTransactionResponse
      );

      const currentStatus = transactionDetails.data.status;
      setTransactionStatus(currentStatus);

      if (currentStatus === "PENDING") {
        setCheckingStatus(true);

        setTimeout(async () => {
          try {
            const newTransactionDetails = await getTransactionDetails(
              gatewayTransactionResponse
            );
            const newStatus = newTransactionDetails.data.status;
            setTransactionStatus(newStatus);

            if (newStatus === "APPROVED") {
              const formattedTransactionDetails = {
                reference: newTransactionDetails.data.reference,
                type: newTransactionDetails.data.payment_method.type,
                finalized_at: newTransactionDetails.data.finalized_at,
                brand: newTransactionDetails.data.payment_method.extra.brand,
                id: newTransactionDetails.data.id,
                status: newTransactionDetails.data.status,
              };

              const updateResponse = await updateTransactionDetails(
                formattedTransactionDetails
              );

              if (updateResponse.status === "APPROVED") {
                toast.success("Pago exitoso!");
                localStorage.clear();
                dispatch(clearCart());
                onClose();
              }
            }
          } catch (error) {
            console.error(
              "Error al consultar nuevamente la transacción:",
              error
            );
          } finally {
            setCheckingStatus(false);
          }
        }, 60000);
      }

      if (transactionDetails.data.status === "APPROVED") {
        const formattedTransactionDetails = {
          reference: transactionDetails.data.reference,
          type: transactionDetails.data.payment_method.type,
          finalized_at: transactionDetails.data.finalized_at,
          brand: transactionDetails.data.payment_method.extra.brand,
          id: transactionDetails.data.id,
          status: transactionDetails.data.status,
        };

        const updateResponse = await updateTransactionDetails(
          formattedTransactionDetails
        );
        if (updateResponse.status === "APPROVED") {
          toast.success("Pago exitoso!");
          localStorage.clear();
          dispatch(clearCart());
          onClose();
        } else {
          throw new Error(
            updateResponse.message || "Error al actualizar la transacción."
          );
        }
      }
    } catch (error) {
      console.error("Error durante el proceso de pago:", error);
      toast.error(error.message || "Ocurrió un error al procesar el pago.");
      setError(error.message || "Ocurrió un error al procesar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-modal-overlay">
      <div className="email-modal-content">
        <button className="email-modal-close-btn" onClick={onClose}>
          ×
        </button>
        {loading && <div className="spinner">Cargando...</div>} {/* Spinner */}
        {showPaymentForm ? (
          transactionStatus ? (
            <div className="transaction-status-view">
              <h3>Estado de tu transacción</h3>
              <h2>
                Estado actual:{" "}
                <strong
                  className={`${
                    transactionStatus === "APPROVED"
                      ? "approved"
                      : transactionStatus === "PENDING"
                      ? "pending"
                      : "wrong"
                  }
                  }`}
                >
                  {transactionStatus}
                </strong>
              </h2>
              {checkingStatus && (
                <p className="info">
                  Esperando confirmación... Reintentando en 1 minuto. no cierres
                  la ventana
                </p>
              )}
            </div>
          ) : (
            <>
              <h3>Información de Pago</h3>
              <p className="email-modal-description">
                Complete los detalles de su tarjeta para proceder con el pago.
              </p>
              <form onSubmit={handlePaymentSubmit}>
                <input
                  type="text"
                  name="number"
                  value={cardDetails.number}
                  onChange={handleCardDetailChange}
                  placeholder="Número de tarjeta"
                  required
                />
                <input
                  type="number"
                  name="cvc"
                  value={cardDetails.cvc}
                  onChange={handleCardDetailChange}
                  placeholder="CVC"
                  required
                />
                <input
                  type="number"
                  name="exp_month"
                  value={cardDetails.exp_month}
                  onChange={handleCardDetailChange}
                  placeholder="Mes de expiración"
                  required
                />
                <input
                  type="number"
                  name="exp_year"
                  value={cardDetails.exp_year}
                  onChange={handleCardDetailChange}
                  placeholder="Año de expiración"
                  required
                />
                <input
                  type="text"
                  name="card_holder"
                  value={cardDetails.card_holder}
                  onChange={handleCardDetailChange}
                  placeholder="Titular de la tarjeta"
                  required
                />
                <input
                  type="number"
                  name="installments"
                  value={cardDetails.installments}
                  onChange={handleCardDetailChange}
                  placeholder="Cuotas"
                  required
                />
                {acceptanceUrl && (
                  <p className="email-modal-terms">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={handleTermsChange}
                    />
                    <label htmlFor="terms">
                      Acepto haber leído los{" "}
                      <a
                        href={acceptanceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        términos y condiciones
                      </a>{" "}
                      y la{" "}
                      <a
                        href={acceptanceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        política de privacidad
                      </a>
                      .
                    </label>
                  </p>
                )}
                <button
                  type="submit"
                  className="email-modal-submit-btn"
                  disabled={!termsAccepted || loading}
                >
                  {loading ? "Procesando..." : "Pagar"}
                </button>
              </form>
            </>
          )
        ) : (
          <>
            <h3>Ingrese su correo electrónico</h3>
            <p className="email-modal-description">
              Para proceder con el pago, necesitamos que proporcione su correo
              electrónico. Esto es necesario para enviarle la confirmación y
              recibo de su compra.
            </p>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Correo electrónico"
                required
              />
              <button
                type="submit"
                className="email-modal-submit-btn"
                disabled={loading}
              >
                {loading ? "Cargando..." : "Continuar"}
              </button>
            </form>
          </>
        )}
        {error && <p className="email-modal-error">{error}</p>}
      </div>
    </div>
  );
};

export default Modal;
