"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// hooks/index.ts
var index_exports = {};
__export(index_exports, {
  getDataFromWallet: () => getDataFromWallet
});
module.exports = __toCommonJS(index_exports);

// hooks/getDataFromWallet.ts
var import_sdk = require("@bsv/sdk");
async function getDataFromWallet(userWallet, options) {
  const errors = {};
  const addError = (key, message) => {
    (errors[key] ?? (errors[key] = [])).push(message);
  };
  return getDataFromWalletWithOptions(userWallet, options, errors, addError);
}
async function getDataFromWalletWithOptions(userWallet, options, errors, addError) {
  if (!userWallet) {
    addError("wallet", "No wallet available");
    return {
      success: false,
      data: null,
      errors
    };
  }
  try {
    const profileType = typeof options?.profileType === "string" && options.profileType.trim() !== "" ? options.profileType : null;
    if (!profileType) {
      addError("config", "No profile type provided");
      const maybeErrors2 = Object.keys(errors).length > 0 ? errors : void 0;
      return {
        success: false,
        data: null,
        errors: maybeErrors2
      };
    }
    const basket = typeof options?.basket === "string" && options.basket.trim() !== "" ? options.basket : null;
    if (!basket) {
      addError("config", "No basket provided");
      const maybeErrors2 = Object.keys(errors).length > 0 ? errors : void 0;
      return {
        success: false,
        data: null,
        errors: maybeErrors2
      };
    }
    const profileCertTypeB64 = import_sdk.Utils.toBase64(import_sdk.Utils.toArray(profileType));
    const extractConnectionTypeName = (certType) => {
      if (certType.includes("LinkedIn")) return "LinkedIn";
      if (certType.includes("Twitter")) return "Twitter";
      if (certType.includes("Instagram")) return "Instagram";
      if (certType.includes("Telegram")) return "Telegram";
      if (certType.includes("Discord")) return "Discord";
      return certType;
    };
    const connectionTypes = (options?.connectionTypes ?? []).filter(
      (type) => typeof type === "string" && type.trim() !== ""
    );
    const certifiers = (options?.certifiers ?? []).filter(
      (key) => typeof key === "string" && key.trim() !== ""
    );
    if (certifiers.length === 0) {
      addError("config", "No certifiers provided");
      const maybeErrors2 = Object.keys(errors).length > 0 ? errors : void 0;
      return {
        success: false,
        data: null,
        errors: maybeErrors2
      };
    }
    const connectionTypesB64 = connectionTypes.map((connType) => import_sdk.Utils.toBase64(import_sdk.Utils.toArray(connType)));
    const requestedTypesB64 = [profileCertTypeB64, ...connectionTypesB64];
    const certificates = await userWallet.listCertificates({
      certifiers,
      types: requestedTypesB64,
      limit: Math.max(10, requestedTypesB64.length * 3)
    });
    const certificate = certificates.certificates.find((c) => c.type === profileCertTypeB64);
    if (!certificate) {
      addError("certificate", "No certificate found");
      const maybeErrors2 = Object.keys(errors).length > 0 ? errors : void 0;
      return {
        success: false,
        data: null,
        errors: maybeErrors2
      };
    }
    const decryptedFields = await import_sdk.MasterCertificate.decryptFields(
      userWallet,
      certificate.keyring,
      certificate.fields,
      certificate.certifier
    );
    const token = await userWallet.listOutputs({
      basket,
      includeCustomInstructions: true,
      limit: 1
    });
    if (token.outputs.length === 0) {
      addError("token", "No token found");
      const maybeErrors2 = Object.keys(errors).length > 0 ? errors : void 0;
      return {
        success: false,
        data: null,
        errors: maybeErrors2
      };
    }
    const output = token.outputs[0];
    let tokenData;
    try {
      tokenData = JSON.parse(output.customInstructions);
    } catch {
      addError("token", "Invalid token customInstructions JSON");
      const maybeErrors2 = Object.keys(errors).length > 0 ? errors : void 0;
      return {
        success: false,
        data: null,
        errors: maybeErrors2
      };
    }
    const connections = [];
    for (let i = 0; i < connectionTypes.length; i++) {
      const connType = connectionTypes[i];
      try {
        const connTypeB64 = connectionTypesB64[i];
        const connCert = certificates.certificates.find((c) => c.type === connTypeB64);
        if (connCert) {
          const connFields = await import_sdk.MasterCertificate.decryptFields(
            userWallet,
            connCert.keyring,
            connCert.fields,
            connCert.certifier
          );
          if (connFields.url) {
            connections.push({
              type: extractConnectionTypeName(connType),
              url: connFields.url,
              verified: true
            });
          }
        }
      } catch (error) {
        addError(
          "connections",
          `Error checking ${connType} certificate${error instanceof Error && error.message ? `: ${error.message}` : ""}`
        );
      }
    }
    const profileData = {
      displayName: decryptedFields.displayName,
      description: tokenData.description || "",
      locationLng: Number(decryptedFields.lng),
      locationLat: Number(decryptedFields.lat),
      email: decryptedFields.email,
      phoneNumber: decryptedFields.phoneNumber,
      imageKey: tokenData.imageKey || null,
      privateFields: tokenData.privateFields || [],
      websites: tokenData.websites || [],
      connections
    };
    const maybeErrors = Object.keys(errors).length > 0 ? errors : void 0;
    return {
      success: true,
      data: profileData,
      errors: maybeErrors
    };
  } catch (error) {
    addError("unknown", error instanceof Error ? error.message : "Unknown error");
    const maybeErrors = Object.keys(errors).length > 0 ? errors : void 0;
    return {
      success: false,
      data: null,
      errors: maybeErrors
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDataFromWallet
});
//# sourceMappingURL=index.cjs.map