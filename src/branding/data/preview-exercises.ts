export interface PreviewExercise {
  title: string;
  tagLabel: string;
  tagClass: "tag-pink" | "tag-purple" | "tag-green" | "tag-neutral";
  equipment: string;
  level: "Principiante" | "Intermedio" | "Avanzado";
  dots: 1 | 2 | 3;
}

export const PREVIEW_EXERCISES: PreviewExercise[] = [
  {
    title: "Curl bíceps con barra Z",
    tagLabel: "BÍCEPS",
    tagClass: "tag-pink",
    equipment: "Barra",
    level: "Intermedio",
    dots: 2,
  },
  {
    title: "Curl piernas acostado",
    tagLabel: "ISQUIO",
    tagClass: "tag-green",
    equipment: "Máquina",
    level: "Principiante",
    dots: 1,
  },
  {
    title: "Curl martillo",
    tagLabel: "BÍCEPS",
    tagClass: "tag-pink",
    equipment: "Mancuerna",
    level: "Principiante",
    dots: 1,
  },
  {
    title: "Curl Scott",
    tagLabel: "BÍCEPS",
    tagClass: "tag-pink",
    equipment: "Otro",
    level: "Intermedio",
    dots: 2,
  },
];
