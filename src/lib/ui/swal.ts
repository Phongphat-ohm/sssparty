import Swal from "sweetalert2";

export const cozySwalConfig = {
  background: "#FFF9F0",
  color: "#3F342B",
  confirmButtonColor: "#D9A441",
  cancelButtonColor: "#7A6A5C",
  customClass: {
    popup: "rounded-3xl border border-[#EADBCC] shadow-xl",
    confirmButton:
      "rounded-xl font-semibold px-5 py-2.5 !text-white !bg-[#D9A441] hover:!bg-[#C28F30] cursor-pointer shadow-xs",
    cancelButton:
      "rounded-xl font-semibold px-5 py-2.5 !text-white !bg-[#7A6A5C] hover:!bg-[#635549] cursor-pointer shadow-xs",
  },
};

export async function showCozyConfirm(
  titleOrOptions:
    | string
    | {
        title: string;
        html?: string;
        text?: string;
        confirmText?: string;
        cancelText?: string;
        icon?: "question" | "warning" | "info";
        focusConfirm?: boolean;
        preConfirm?: () => any;
      },
  text?: string
) {
  let swalOptions: any;

  if (typeof titleOrOptions === "string") {
    swalOptions = {
      title: titleOrOptions,
      text: text,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      allowOutsideClick: false,
      ...cozySwalConfig,
    };
  } else {
    swalOptions = {
      title: titleOrOptions.title,
      html: titleOrOptions.html,
      text: titleOrOptions.text,
      icon: titleOrOptions.icon || "question",
      showCancelButton: true,
      confirmButtonText: titleOrOptions.confirmText || "ยืนยัน",
      cancelButtonText: titleOrOptions.cancelText || "ยกเลิก",
      focusConfirm: titleOrOptions.focusConfirm,
      preConfirm: titleOrOptions.preConfirm,
      allowOutsideClick: false,
      ...cozySwalConfig,
    };
  }

  return Swal.fire(swalOptions);
}

export async function showCozySuccess(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: "success",
    confirmButtonText: "ตกลง",
    ...cozySwalConfig,
    customClass: {
      popup: "rounded-3xl border border-[#EADBCC]",
      confirmButton:
        "rounded-xl font-semibold px-6 py-2.5 !text-white !bg-[#D9A441] hover:!bg-[#C28F30] cursor-pointer shadow-xs",
    },
  });
}

export async function showCozyError(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: "error",
    confirmButtonText: "ปิด",
    ...cozySwalConfig,
    confirmButtonColor: "#B94E48",
    customClass: {
      popup: "rounded-3xl border border-[#EADBCC]",
      confirmButton:
        "rounded-xl font-semibold px-6 py-2.5 !text-white !bg-[#B94E48] hover:!bg-[#A33F39] cursor-pointer shadow-xs",
    },
  });
}

export async function showCozyWarning(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    confirmButtonText: "รับทราบ",
    ...cozySwalConfig,
  });
}
