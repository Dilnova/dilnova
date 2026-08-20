import { useState, useEffect } from "react";
import { getCustomerDeliveryDetailsAction } from "@/features/cart/checkout.actions";

export function useShippingAddressState(isSignedIn: boolean) {
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddressLine2, setShippingAddressLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("LK");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingPhone2, setShippingPhone2] = useState("");
  /**
   * Only true once the user has explicitly interacted with / confirmed the
   * address fields in the current session, or when saved delivery details are loaded.
   */
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  useEffect(() => {
    async function loadSavedDeliveryDetails() {
      if (isSignedIn) {
        const result = await getCustomerDeliveryDetailsAction({});
        const details = result?.data;
        if (details) {
          if (details.shippingAddress) setShippingAddress(details.shippingAddress);
          if (details.shippingAddressLine2) setShippingAddressLine2(details.shippingAddressLine2);
          if (details.shippingCity) setShippingCity(details.shippingCity);
          if (details.shippingState) setShippingState(details.shippingState);
          if (details.shippingPostalCode) setShippingPostalCode(details.shippingPostalCode);
          if (details.shippingCountry) setShippingCountry(details.shippingCountry);
          if (details.shippingPhone) setShippingPhone(details.shippingPhone);
          if (details.shippingPhone2) setShippingPhone2(details.shippingPhone2);

          if (details.shippingCity && (details.shippingCountry || "LK")) {
            setAddressConfirmed(true);
          }
        }
      }
    }
    loadSavedDeliveryDetails();
  }, [isSignedIn]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Mark address as confirmed (user is actively editing) on first change
    setAddressConfirmed(true);
    switch (name) {
      case "shippingAddress":
        setShippingAddress(value);
        break;
      case "shippingAddressLine2":
        setShippingAddressLine2(value);
        break;
      case "shippingCity":
        setShippingCity(value);
        break;
      case "shippingState":
        setShippingState(value);
        break;
      case "shippingPostalCode":
        setShippingPostalCode(value);
        break;
      case "shippingCountry":
        setShippingCountry(value);
        break;
      case "shippingPhone":
        setShippingPhone(value);
        break;
      case "shippingPhone2":
        setShippingPhone2(value);
        break;
    }
  };

  return {
    shippingAddress,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountry,
    shippingPhone,
    shippingPhone2,
    addressConfirmed,
    handleAddressChange,
  };
}
