import React from "react";
import { AbsoluteFill } from "remotion";

interface CaptionStyle {
  fontSize: number;
  fontFamily: string;
  activeWordColor: string;
  inactiveWordColor: string;
  backgroundColor: string;
  fontWeight: string;
  textTransform: string;
  textShadow: string;
  showEmojis: boolean;
  fromBottom: number;
  wordsPerBatch: number;
}

interface WordData {
  text: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface DynamicCaptionsProps {
  words: WordData[];
  displayText: string;
  captionStyle: CaptionStyle;
}

export const DynamicCaptions: React.FC<DynamicCaptionsProps> = ({
  words,
  displayText,
  captionStyle,
}) => {
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        paddingBottom: `${captionStyle.fromBottom}%`,
      }}
    >
      <CaptionContainer captionStyle={captionStyle}>
        {words.length > 0 ? (
          <WordRenderer words={words} captionStyle={captionStyle} />
        ) : (
          <span
            style={{
              color: captionStyle.activeWordColor,
            }}
          >
            {displayText}
          </span>
        )}
      </CaptionContainer>
    </AbsoluteFill>
  );
};

interface CaptionContainerProps {
  children: React.ReactNode;
  captionStyle: CaptionStyle;
}

const CaptionContainer: React.FC<CaptionContainerProps> = ({
  children,
  captionStyle,
}) => {
  return (
    <div
      style={{
        fontSize: captionStyle.fontSize,
        fontWeight: captionStyle.fontWeight,
        fontFamily: captionStyle.fontFamily,
        textAlign: "center",
        textShadow: captionStyle.textShadow,
        textTransform: captionStyle.textTransform as any,
        backgroundColor: captionStyle.backgroundColor,
        lineHeight: 1.3,
        maxWidth: "90%",
        padding:
          captionStyle.backgroundColor !== "transparent"
            ? "16px 32px"
            : "0",
        borderRadius:
          captionStyle.backgroundColor !== "transparent" ? "12px" : "0",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.3em",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
};

interface WordRendererProps {
  words: WordData[];
  captionStyle: CaptionStyle;
}

const WordRenderer: React.FC<WordRendererProps> = ({
  words,
  captionStyle,
}) => {
  return (
    <>
      {words.map((word, index) => (
        <WordSpan
          key={index}
          word={word}
          captionStyle={captionStyle}
        />
      ))}
    </>
  );
};

interface WordSpanProps {
  word: WordData;
  captionStyle: CaptionStyle;
}

const WordSpan: React.FC<WordSpanProps> = ({ word, captionStyle }) => {
  return (
    <span
      style={{
        color: word.isActive
          ? captionStyle.activeWordColor
          : word.isCompleted
            ? captionStyle.activeWordColor
            : captionStyle.inactiveWordColor,
        opacity: word.isCompleted ? 0.85 : word.isActive ? 1 : 0.6,
        display: "inline-block",
        textShadow: word.isActive
          ? `${captionStyle.textShadow}, 0 0 25px ${captionStyle.activeWordColor}60, 0 0 40px ${captionStyle.activeWordColor}30`
          : captionStyle.textShadow,
        filter: word.isActive ? "brightness(1.2)" : "brightness(1)",
        fontWeight: word.isActive ? "900" : captionStyle.fontWeight,
      }}
    >
      {word.text}
    </span>
  );
};